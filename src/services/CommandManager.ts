/**
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
 *
 * SudoBot is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SudoBot is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
 */

import { GlobalUserBan } from "@prisma/client";
import {
    ChatInputCommandInteraction,
    Collection,
    ContextMenuCommandInteraction,
    InteractionReplyOptions,
    Message,
    Snowflake,
    User
} from "discord.js";
import { CommandMessage } from "../core/Command";
import Service from "../core/Service";
import { log, logError, logWarn } from "../utils/Logger";
import { GuildConfig } from "./ConfigManager";

export const name = "commandManager";

export interface CommandContext {
    isLegacy: boolean;
    config: GuildConfig;
}

export interface LegacyCommandContext extends CommandContext {
    isLegacy: true;
    isContextMenu: false;
    argv: string[];
    args: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parsedArgs: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parsedNamedArgs: Record<string, any>;
    prefix: string;
    has(arg: string): boolean;
}

export interface ChatInputCommandContext extends CommandContext {
    isLegacy: false;
    isContextMenu: false;
    options: ChatInputCommandInteraction["options"];
    commandName: string;
}

export interface ContextMenuCommandContext extends CommandContext {
    isLegacy: false;
    isContextMenu: true;
    options: ContextMenuCommandInteraction["options"];
    commandName: string;
}

export default class CommandManager extends Service {
    protected readonly userBans = new Collection<Snowflake, GlobalUserBan>();

    async boot() {
        const bans = await this.client.prisma.globalUserBan.findMany();

        for (const ban of bans) {
            this.userBans.set(ban.userId, ban);
        }
    }

    getBan(userId: Snowflake) {
        return this.userBans.get(userId);
    }

    isBanned(userId: Snowflake) {
        return this.userBans.has(userId);
    }

    async addBan(userId: Snowflake, executorId: Snowflake, reason: string | null = null) {
        if (this.isBanned(userId)) {
            throw new Error("This user is already banned");
        }

        const ban = await this.client.prisma.globalUserBan.create({
            data: {
                userId,
                reason,
                executorId
            }
        });

        this.userBans.set(ban.userId, ban);
        return ban;
    }

    async removeBan(userId: Snowflake) {
        const ban = this.getBan(userId);

        if (!ban) {
            return null;
        }

        const info = await this.client.prisma.globalUserBan.delete({
            where: {
                id: ban.id
            }
        });

        this.userBans.delete(ban.userId);
        return info;
    }

    async notifyBannedUser(user: User) {
        const ban = this.getBan(user.id);

        if (ban) {
            const newBan = await this.client.prisma.globalUserBan.update({
                where: {
                    id: ban.id
                },
                data: {
                    notified: true
                }
            });

            this.userBans.set(ban.userId, newBan);

            await user
                .send({
                    embeds: [
                        {
                            author: {
                                icon_url: this.client.user?.displayAvatarURL(),
                                name: "You have been banned from using SudoBot"
                            },
                            description:
                                "You won't be able to use SudoBot anymore, and your SudoBot account will be terminated. Please try not to violate the SudoBot [Terms of Service](https://docs.sudobot.org/legal/terms) before we take action on your account.",
                            fields: [
                                {
                                    name: "Reason",
                                    value: ban.reason ?? "No reason provided"
                                }
                            ],
                            color: 0xf14a60,
                            timestamp: new Date().toISOString()
                        }
                    ]
                })
                .catch(logError);

            return newBan;
        }
    }

    public async runCommandFromMessage(message: Message, checkOnly = false, wait: boolean = false) {
        if (!message.content) return;

        const config = this.client.configManager.config[message.guildId!];

        if (!config) {
            logWarn("This guild is not configured: ", message.guildId!);
            return;
        }

        const prefixes = [config.prefix];
        let foundPrefix: string | undefined = undefined;

        if (this.client.configManager.systemConfig.commands.mention_prefix && config.commands.mention_prefix) {
            prefixes.push(`<@${this.client.user!.id}>`, `<@!${this.client.user!.id}>`);
        }

        for (const prefix of prefixes) {
            if (message.content.startsWith(prefix)) {
                foundPrefix = prefix;
                break;
            }
        }

        if (!foundPrefix) {
            return;
        }

        const commandText = message.content.substring(foundPrefix.length).trimStart();
        const [commandName, ...commandArguments] = commandText.split(/ +/);

        if (commandName.includes("__")) {
            return;
        }

        const command = this.client.commands.get(commandName);

        if (!command) {
            log("Command not found, trying to find a snippet");
            return await this.client.snippetManager.onMessageCreate(message, foundPrefix, commandName);
        }

        if (!command.supportsLegacy) {
            log("This command does not support legacy mode");
            return;
        }

        const context = {
            isLegacy: true,
            argv: [commandName, ...commandArguments],
            args: commandArguments,
            config,
            parsedArgs: [],
            parsedNamedArgs: {},
            isContextMenu: false,
            prefix: foundPrefix,
            has(arg: string) {
                return this.args.includes(arg);
            }
        } satisfies LegacyCommandContext;

        const handlerObject = {
            _stopped: false,
            stopCommandExecution() {
                this._stopped = true;
            }
        };

        await this.client.emitWaitLocal("command", command.name, handlerObject, command, message, context);
        await Promise.resolve();

        if (handlerObject._stopped) {
            return;
        }

        return new Promise<boolean | null>((resolve, reject) => {
            command
                .run({
                    context,
                    checkOnly,
                    message,
                    onAbort: wait ? () => resolve(null) : undefined
                })
                .then(result => {
                    if (result && typeof result === "object" && "__reply" in result && result.__reply === true) {
                        message.reply(result as Parameters<typeof message.reply>[0]).catch(console.error);
                    }
                    if (wait) {
                        resolve(true);
                    }
                })
                .catch(e => {
                    logError(e);
                    reject(e);
                });

            if (!wait) {
                resolve(true);
            }
        });
    }

    public async runCommandFromCommandInteraction(interaction: Exclude<CommandMessage, Message>, checkOnly = false) {
        const config = this.client.configManager.config[interaction.guildId!];

        if (!config) {
            logWarn("This guild is not configured: ", interaction.guildId!);
            return;
        }

        const { commandName } = interaction;
        const command = this.client.commands.get(commandName);

        if (!command) {
            return false;
        }

        if (!command.supportsInteractions) {
            log("This command does not support application command mode");
            return;
        }

        const context = {
            isLegacy: false,
            config,
            options: interaction.options,
            isContextMenu: interaction.isContextMenuCommand(),
            commandName
        } as ContextMenuCommandContext | ChatInputCommandContext;

        const handlerObject = {
            _stopped: false,
            stopCommandExecution() {
                this._stopped = true;
            }
        };

        await this.client.emitWait("command", command.name, handlerObject, command, interaction, context);
        await Promise.resolve();

        if (handlerObject._stopped) {
            return;
        }

        command
            .run({
                message: interaction,
                context,
                checkOnly
            })
            .then(result => {
                if (result && typeof result === "object" && "__reply" in result && result.__reply === true) {
                    interaction.reply(result as InteractionReplyOptions).catch(console.error);
                }
            })
            .catch(logError);
    }
}
