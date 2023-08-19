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

import { CommandPermissionOverwrites } from "@prisma/client";
import { ChatInputCommandInteraction, ContextMenuCommandInteraction, Message, Snowflake } from "discord.js";
import Command, { CommandMessage, ValidationRuleParsedArgs } from "../core/Command";
import Service from "../core/Service";
import { GatewayEventListener } from "../decorators/GatewayEventListener";
import { HasEventListeners } from "../types/HasEventListeners";
import { log, logError, logWarn } from "../utils/logger";
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
    parsedArgs: any[];
    parsedNamedArgs: Record<string, any>;
    prefix: string;
    has(arg: string): boolean;
    getParsedArgs<C extends Command>(command: C): ValidationRuleParsedArgs<C["validationRules"]>;
    getParsedArg<C extends Command, I extends keyof C["validationRules"]>(
        command: C,
        index: I
    ): ValidationRuleParsedArgs<C["validationRules"]>[I];
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

export default class CommandManager extends Service implements HasEventListeners {
    readonly permissionOverwrites = new Map<`${Snowflake}____${string}`, CommandPermissionOverwrites>();

    @GatewayEventListener("ready")
    async onReady() {
        log("Syncing command permission overwrites...");

        const permissionOverwrites = await this.client.prisma.commandPermissionOverwrites.findMany();

        for (const permissionOverwrite of permissionOverwrites) {
            for (const command of permissionOverwrite.commands) {
                this.permissionOverwrites.set(`${permissionOverwrite.guildId}____${command}`, permissionOverwrite);
            }
        }

        log("Successfully synced command permission overwrites");
    }

    public async runCommandFromMessage(message: Message, checkOnly = false) {
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

        const command = this.client.commands.get(commandName);

        if (!command) {
            log("Command not found, trying to find a snippet");
            return await this.client.snippetManager.onMessageCreate(message, commandName);
        }

        command
            .run(
                message,
                {
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
                    },
                    getParsedArg<C extends Command, I extends keyof C["validationRules"]>(command: C, index: I) {
                        return this.parsedArgs[index as number] as ValidationRuleParsedArgs<C["validationRules"]>[I];
                    },
                    getParsedArgs<C extends Command>(command: C) {
                        return this.parsedArgs as ValidationRuleParsedArgs<C["validationRules"]>;
                    }
                } satisfies LegacyCommandContext,
                checkOnly
            )
            .then(result => {
                if (result && typeof result === "object" && "__reply" in result && result.__reply === true) {
                    message.reply(result as any).catch(console.error);
                }
            })
            .catch(logError);

        return true;
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

        command
            .run(
                interaction,
                {
                    isLegacy: false,
                    config,
                    options: interaction.options,
                    isContextMenu: interaction.isContextMenuCommand(),
                    commandName
                } as ContextMenuCommandContext | ChatInputCommandContext,
                checkOnly
            )
            .then(result => {
                if (result && typeof result === "object" && "__reply" in result && result.__reply === true) {
                    interaction.reply(result as any).catch(console.error);
                }
            })
            .catch(logError);
    }
}
