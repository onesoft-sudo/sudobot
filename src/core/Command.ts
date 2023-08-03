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

import {
    APIMessage,
    ApplicationCommandType,
    CacheType,
    ChatInputCommandInteraction,
    ContextMenuCommandBuilder,
    ContextMenuCommandInteraction,
    GuildMember,
    InteractionDeferReplyOptions,
    InteractionEditReplyOptions,
    InteractionReplyOptions,
    Message,
    MessageCreateOptions,
    MessageMentions,
    MessagePayload,
    PermissionResolvable,
    PermissionsBitField,
    SlashCommandBuilder
} from "discord.js";
import { ChatInputCommandContext, ContextMenuCommandContext, LegacyCommandContext } from "../services/CommandManager";
import { log, logError } from "../utils/logger";
import { getEmoji, isSnowflake, stringToTimeInterval } from "../utils/utils";
import Client from "./Client";

export type CommandMessage = Message<boolean> | ChatInputCommandInteraction<CacheType> | ContextMenuCommandInteraction;
export type BasicCommandContext = LegacyCommandContext | ChatInputCommandContext;
export type AnyCommandContext = BasicCommandContext | ContextMenuCommandContext;
export type CommandReturn = ((MessageCreateOptions | APIMessage | InteractionReplyOptions) & { __reply?: boolean }) | undefined | null | void;

export enum ArgumentType {
    String = 1,
    StringRest,
    Number,
    Integer,
    Float,
    Boolean,
    Snowflake,
    User,
    GuildMember,
    Channel,
    Role,
    Link,
    TimeInterval
}

export interface ValidationRule {
    types?: ArgumentType[];
    optional?: boolean;
    default?: any;
    requiredErrorMessage?: string;
    typeErrorMessage?: string;
    entityNotNullErrorMessage?: string;
    entityNotNull?: boolean;
    minValue?: number;
    maxValue?: number;
    minMaxErrorMessage?: string;
    lengthMaxErrorMessage?: string;
    lengthMax?: number;
    name?: string;
    timeMilliseconds?: boolean;
}

export default abstract class Command {
    public readonly name: string = "";
    public group: string = "Default";
    public readonly aliases: string[] = [];

    public readonly supportsInteractions: boolean = true;
    public readonly supportsLegacy: boolean = true;

    public readonly permissions: PermissionResolvable[] = [];
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissionMode: "or" | "and" = "and";
    public readonly systemAdminOnly: boolean = false;

    public readonly description?: string;
    public readonly detailedDescription?: string;
    public readonly argumentSyntaxes?: string[];
    public readonly availableOptions?: Record<string, string>;
    public readonly beta: boolean = false;
    public readonly since: string = "1.0.0";
    public readonly botRequiredPermissions: PermissionResolvable[] = [];
    public readonly slashCommandBuilder?:
        | Partial<Pick<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">>
        | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;

    public readonly applicationCommandType: ApplicationCommandType = ApplicationCommandType.ChatInput;
    public readonly otherApplicationCommandBuilders: (ContextMenuCommandBuilder | SlashCommandBuilder)[] = [];

    public readonly subcommands: string[] = [];

    constructor(protected client: Client) {}

    abstract execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn>;

    async deferIfInteraction(message: CommandMessage, options?: InteractionDeferReplyOptions) {
        if (message instanceof ChatInputCommandInteraction) await message.deferReply(options).catch(logError);
    }

    async deferredReply(message: CommandMessage, options: MessageCreateOptions | MessagePayload | InteractionEditReplyOptions | string) {
        if (message instanceof ChatInputCommandInteraction) {
            return await message.editReply(options);
        }

        return message.reply(options as any);
    }

    async error(message: CommandMessage, errorMessage?: string) {
        return await this.deferredReply(
            message,
            errorMessage
                ? `${this.emoji("error")} ${errorMessage}`
                : `⚠️ An error has occurred while performing this action. Please make sure that the bot has the required permissions to perform this action.`
        );
    }

    async success(message: CommandMessage, successMessage?: string) {
        return await this.deferredReply(
            message,
            successMessage ? `${this.emoji("check")} ${successMessage}` : `Successfully completed the given task.`
        );
    }

    emoji(name: string) {
        return getEmoji(this.client, name);
    }

    async run(message: CommandMessage, context: AnyCommandContext) {
        if (this.systemAdminOnly && !this.client.configManager.systemConfig.system_admins.includes(message.member!.user.id)) {
            message
                .reply({
                    content: `${this.emoji("error")} You don't have permission to run this command.`,
                    ephemeral: true
                })
                .catch(logError);

            return;
        }

        const { validationRules, permissions } = this;
        const parsedArgs = [];
        const parsedNamedArgs: Record<string, any> = {};

        if (permissions.length > 0) {
            let member: GuildMember = <any>message.member!;

            if (!(member.permissions as any)?.has) {
                try {
                    member = await message.guild!.members.fetch(member.user.id);

                    if (!member) {
                        throw new Error("Invalid member");
                    }
                } catch (e) {
                    logError(e);
                    message
                        .reply({
                            content: `Sorry, I couldn't determine whether you have the enough permissions to perform this action or not. Please contact the bot developer.`,
                            ephemeral: true
                        })
                        .catch(logError);
                    return;
                }
            }

            if (this.permissionMode === "and") {
                for (const permission of permissions) {
                    if (!member.permissions.has(permission, true)) {
                        const mode = this.client.configManager.config[message.guildId!]?.permissions?.mode;

                        if (mode !== "advanced" && mode !== "levels") {
                            await message.reply({
                                content: `${this.emoji("error")} You don't have permission to run this command.`,
                                ephemeral: true
                            });

                            log("Skip");

                            return;
                        }

                        const memberBotPermissions = this.client.permissionManager.getMemberPermissions(member);
                        const memberRequiredPermissions = new PermissionsBitField(permissions).toArray();

                        log("PERMS: ", [...memberBotPermissions.values()]);
                        log("PERMS 2: ", memberRequiredPermissions);

                        for (const memberRequiredPermission of memberRequiredPermissions) {
                            if (!memberBotPermissions.has(memberRequiredPermission)) {
                                await message.reply({
                                    content: `${this.emoji("error")} You don't have permission to run this command.`,
                                    ephemeral: true
                                });

                                return;
                            }
                        }
                    }
                }
            } else
                orMode: {
                    for (const permission of permissions) {
                        if (member.permissions.has(permission, true)) {
                            break orMode;
                        }
                    }

                    const mode = this.client.configManager.config[message.guildId!]?.permissions?.mode;

                    if (mode === "advanced" || mode === "levels") {
                        const memberBotPermissions = this.client.permissionManager.getMemberPermissions(member);
                        const memberRequiredPermissions = new PermissionsBitField(permissions).toArray();

                        for (const memberRequiredPermission of memberRequiredPermissions) {
                            if (memberBotPermissions.has(memberRequiredPermission)) {
                                break orMode;
                            }
                        }
                    }

                    await message.reply({
                        content: `${this.emoji("error")} You don't have enough permissions to run this command.`,
                        ephemeral: true
                    });

                    return;
                }
        }

        if (context.isLegacy) {
            let index = 0;

            loop: for await (const rule of validationRules) {
                const arg = context.args[index];

                if (arg === undefined) {
                    if (!rule.optional) {
                        await this.error(message, rule.requiredErrorMessage ?? `Argument #${index} is required`);
                        return;
                    }

                    if (rule.default !== undefined) {
                        parsedArgs.push(rule.default);
                    }

                    continue;
                }

                if (rule.types) {
                    const prevLengthOuter = parsedArgs.length;

                    for (const type of rule.types) {
                        const prevLength = parsedArgs.length;

                        if (
                            /^(\-)?[\d\.]+$/.test(arg) &&
                            (((rule.minValue || rule.maxValue) && type === ArgumentType.Float) ||
                                type === ArgumentType.Integer ||
                                type === ArgumentType.Number)
                        ) {
                            const float = parseFloat(arg);

                            if (
                                !isNaN(float) &&
                                ((rule.minValue !== undefined && rule.minValue > float) || (rule.maxValue !== undefined && rule.maxValue < float))
                            ) {
                                await message.reply(
                                    rule.minMaxErrorMessage ??
                                        `Argument #${index} has a min/max numeric value range but the given value is out of range.`
                                );
                                return;
                            }
                        }

                        switch (type) {
                            case ArgumentType.Boolean:
                                if (["true", "false"].includes(arg.toLowerCase())) {
                                    parsedArgs[index] = arg.toLowerCase() === "true";
                                }

                                break;

                            case ArgumentType.Float:
                                const float = parseFloat(arg);

                                if (isNaN(float)) {
                                    break;
                                }

                                parsedArgs[index] = float;
                                break;

                            case ArgumentType.Integer:
                                if (!/^(\-)?\d+$/.test(arg)) {
                                    break;
                                }

                                const int = parseInt(arg);

                                if (isNaN(int)) {
                                    break;
                                }

                                parsedArgs[index] = int;
                                break;

                            case ArgumentType.Number:
                                const number = arg.includes(".") ? parseFloat(arg) : parseInt(arg);

                                if (isNaN(number)) {
                                    break;
                                }

                                parsedArgs[index] = number;
                                break;

                            case ArgumentType.TimeInterval:
                                const { result, error } = stringToTimeInterval(arg, {
                                    milliseconds: rule.timeMilliseconds ?? false
                                });

                                if (error) {
                                    if (rule.types.length === 1) {
                                        await message
                                            .reply({
                                                ephemeral: true,
                                                content: error
                                            })
                                            .catch(logError);
                                    }

                                    break;
                                }

                                if (
                                    !isNaN(result) &&
                                    ((rule.minValue !== undefined && rule.minValue > result) ||
                                        (rule.maxValue !== undefined && rule.maxValue < result))
                                ) {
                                    await message.reply(
                                        `${this.emoji("error")} ` + rule.minMaxErrorMessage ??
                                            `Argument #${index} has a min/max numeric time value range but the given value is out of range.`
                                    );
                                    return;
                                }

                                parsedArgs[index] = result;
                                break;

                            case ArgumentType.Link:
                                try {
                                    parsedArgs[index] = new URL(arg);
                                } catch (e) {
                                    break;
                                }

                                break;

                            case ArgumentType.String:
                                if (arg.trim() === "") break;

                                parsedArgs[index] = arg;
                                break;

                            case ArgumentType.Snowflake:
                                if (!isSnowflake(arg)) break;

                                parsedArgs[index] = arg;
                                break;

                            case ArgumentType.User:
                            case ArgumentType.GuildMember:
                            case ArgumentType.Channel:
                            case ArgumentType.Role:
                                // TODO: Use message.mentions object to improve performance and reduce API requests

                                let id;

                                if (MessageMentions.UsersPattern.test(arg)) {
                                    id = arg.substring(arg.includes("!") ? 3 : 2, arg.length - 1);
                                } else if (MessageMentions.ChannelsPattern.test(arg)) {
                                    id = arg.substring(2, arg.length - 1);
                                } else if (MessageMentions.RolesPattern.test(arg)) {
                                    id = arg.substring(3, arg.length - 1);
                                } else if (isSnowflake(arg)) {
                                    id = arg;
                                } else {
                                    break;
                                }

                                try {
                                    let entity = null;

                                    if (type === ArgumentType.User) entity = await this.client.users.fetch(id);
                                    else {
                                        entity =
                                            type === ArgumentType.Role
                                                ? await message.guild!.roles.fetch(id)
                                                : type === ArgumentType.Channel
                                                ? await message.guild!.channels.fetch(id)
                                                : await message.guild!.members.fetch(id);
                                    }

                                    if (!entity) {
                                        throw new Error("Invalid entity received");
                                    }

                                    parsedArgs[index] = entity;
                                } catch (e) {
                                    logError(e);

                                    if (rule.entityNotNull) {
                                        await message.reply(
                                            `${this.emoji("error")} ` + rule.entityNotNullErrorMessage ?? `Argument ${index} is invalid`
                                        );
                                        return;
                                    }

                                    parsedArgs[index] = null;
                                }

                                break;

                            case ArgumentType.StringRest:
                                if (arg.trim() === "") break;

                                const config = this.client.configManager.config[message.guildId!];

                                let str = ((message as Message).content ?? "")
                                    .slice(config?.prefix.length)
                                    .trimStart()
                                    .slice(context.argv[0].length)
                                    .trimStart();

                                for (let i = 0; i < index; i++) {
                                    str = str.slice(context.args[i].length).trimStart();
                                }

                                str = str.trimEnd();

                                if (str === "") break;

                                parsedArgs[index] = str;

                                if (rule.name) {
                                    parsedNamedArgs[rule.name] = parsedArgs[index];
                                }

                                break loop;
                        }

                        if (rule.lengthMax !== undefined && typeof parsedArgs[index] === "string" && parsedArgs[index].length > rule.lengthMax) {
                            await message.reply(`${this.emoji("error")} ` + rule.lengthMaxErrorMessage ?? `Argument #${index} is too long`);
                            return;
                        }

                        if (prevLength !== parsedArgs.length) {
                            break;
                        }
                    }

                    if (prevLengthOuter === parsedArgs.length) {
                        await message.reply(`${this.emoji("error")} ` + rule.typeErrorMessage ?? `Argument #${index} is invalid, type mismatch`);
                        return;
                    }
                }

                if (rule.name) {
                    parsedNamedArgs[rule.name] = parsedArgs[index];
                }

                index++;
            }
        }

        return await this.execute(message, {
            ...context,
            ...(context.isLegacy
                ? {
                      parsedArgs,
                      parsedNamedArgs
                  }
                : {})
        });
    }
}
