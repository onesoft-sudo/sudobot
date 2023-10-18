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
    GuildBasedChannel,
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
    Role,
    SlashCommandBuilder,
    Snowflake,
    User
} from "discord.js";
import { ChatInputCommandContext, ContextMenuCommandContext, LegacyCommandContext } from "../services/CommandManager";
import { stringToTimeInterval } from "../utils/datetime";
import { log, logError } from "../utils/logger";
import { getEmoji, isSnowflake } from "../utils/utils";
import Client from "./Client";

export type CommandMessage = Message<boolean> | ChatInputCommandInteraction<CacheType> | ContextMenuCommandInteraction;
export type BasicCommandContext = LegacyCommandContext | ChatInputCommandContext;
export type AnyCommandContext = BasicCommandContext | ContextMenuCommandContext;
export type CommandReturn =
    | ((MessageCreateOptions | APIMessage | InteractionReplyOptions) & { __reply?: boolean })
    | undefined
    | null
    | void;

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
    types?: readonly ArgumentType[];
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
    rawLinkString?: boolean;
}

type ValidationRuleAndOutputMap = {
    [ArgumentType.Boolean]: boolean;
    [ArgumentType.Channel]: GuildBasedChannel;
    [ArgumentType.Float]: number;
    [ArgumentType.Number]: number;
    [ArgumentType.Integer]: number;
    [ArgumentType.TimeInterval]: number;
    [ArgumentType.Link]: string;
    [ArgumentType.Role]: Role;
    [ArgumentType.Snowflake]: Snowflake;
    [ArgumentType.String]: string;
    [ArgumentType.StringRest]: string;
    [ArgumentType.User]: User;
    [ArgumentType.GuildMember]: GuildMember;
};

type ValidationRuleParsedArg<T extends ValidationRule["types"]> = T extends ReadonlyArray<infer U>
    ? U extends keyof ValidationRuleAndOutputMap
        ? ValidationRuleAndOutputMap[U]
        : never
    : T extends Array<infer U>
    ? U extends keyof ValidationRuleAndOutputMap
        ? ValidationRuleAndOutputMap[U]
        : never
    : never;

export type ValidationRuleParsedArgs<T extends readonly ValidationRule[]> = {
    [K in keyof T]: ValidationRuleParsedArg<T[K]["types"]>;
};

type DeferReplyMode = "delete" | "channel" | "default" | "auto";

// TODO: Split the logic into separate methods

export default abstract class Command {
    public readonly name: string = "";
    public group: string = "Default";
    public readonly aliases: string[] = [];

    public readonly supportsInteractions: boolean = true;
    public readonly supportsLegacy: boolean = true;

    public readonly permissions: PermissionResolvable[] = [];
    public readonly validationRules: readonly ValidationRule[] = [];
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
    public readonly subCommandCheck: boolean = false;

    constructor(protected client: Client) {}

    abstract execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn>;

    async deferIfInteraction(message: CommandMessage, options?: InteractionDeferReplyOptions) {
        if (message instanceof ChatInputCommandInteraction) return await message.deferReply(options).catch(logError);
    }

    async deferredReply(
        message: CommandMessage,
        options: MessageCreateOptions | MessagePayload | InteractionEditReplyOptions | string,
        mode: DeferReplyMode = "default"
    ) {
        if (message instanceof ChatInputCommandInteraction || message instanceof ContextMenuCommandInteraction) {
            return message.deferred ? await message.editReply(options) : await message.reply(options as any);
        }

        const behaviour = this.client.configManager.config[message.guildId!]?.commands.moderation_command_behaviour;

        if ((mode === "delete" || (mode === "auto" && behaviour === "delete")) && message instanceof Message) {
            await message.delete().catch(logError);
        }

        return mode === "delete" || (mode === "auto" && behaviour === "delete") || mode === "channel"
            ? message.channel.send(options as any)
            : message.reply(options as any);
    }

    async error(message: CommandMessage, errorMessage?: string, mode: DeferReplyMode = "default") {
        return await this.deferredReply(
            message,
            errorMessage
                ? `${this.emoji("error")} ${errorMessage}`
                : `⚠️ An error has occurred while performing this action. Please make sure that the bot has the required permissions to perform this action.`,
            mode
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

    async run(message: CommandMessage, context: AnyCommandContext, checkOnly = false, onAbort?: () => any) {
        const isSystemAdmin = this.client.configManager.systemConfig.system_admins.includes(message.member!.user.id);

        if (this.systemAdminOnly && !isSystemAdmin) {
            message
                .reply({
                    content: `${this.emoji("error")} You don't have permission to run this command.`,
                    ephemeral: true
                })
                .catch(logError);
            onAbort?.();

            return;
        }

        if (!isSystemAdmin) {
            const commandName = this.client.commands.get(context.isLegacy ? context.argv[0] : context.commandName)?.name;
            const { disabled_commands } = this.client.configManager.systemConfig;

            if (disabled_commands.includes(commandName ?? "")) {
                await this.error(message, "This command is disabled.");
                onAbort?.();
                return;
            }

            const { channels, guild } = this.client.configManager.config[message.guildId!]?.disabled_commands ?? {};

            if (guild && guild.includes(commandName ?? "")) {
                await this.error(message, "This command is disabled in this server.");
                onAbort?.();
                return;
            }

            if (channels && channels[message.channelId!] && channels[message.channelId!].includes(commandName ?? "")) {
                await this.error(message, "This command is disabled in this channel.");
                onAbort?.();
                return;
            }
        }

        const { validationRules, permissions } = this;
        const parsedArgs = [];
        const parsedNamedArgs: Record<string, any> = {};

        if (!isSystemAdmin) {
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
                    onAbort?.();
                    return;
                }
            }

            const mode = this.client.configManager.config[message.guildId!]?.permissions?.mode;
            const permissionOverwrite = this.client.commandManager.permissionOverwrites.get(
                `${message.guildId!}____${this.name}`
            );

            if (
                permissions.length > 0 &&
                (this.client.configManager.systemConfig.default_permissions_mode === "check" ||
                    (!permissionOverwrite && this.client.configManager.systemConfig.default_permissions_mode === "overwrite"))
            ) {
                const memberBotPermissions = this.client.permissionManager.getMemberPermissions(member);
                const memberRequiredPermissions = new PermissionsBitField(permissions).toArray();

                if (this.permissionMode === "and") {
                    for (const permission of permissions) {
                        if (!member.permissions.has(permission, true)) {
                            const mode = this.client.configManager.config[message.guildId!]?.permissions?.mode;

                            if (mode !== "advanced" && mode !== "levels") {
                                await message.reply({
                                    content: `${this.emoji("error")} You don't have permission to run this command.`,
                                    ephemeral: true
                                });
                                onAbort?.();

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

                                    onAbort?.();
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

                        if (mode === "advanced" || mode === "levels") {
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

                        onAbort?.();
                        return;
                    }
            }

            log([...this.client.commandManager.permissionOverwrites.keys()]);

            errorRootBlock: if (permissionOverwrite) {
                let userCheckPassed = false;
                let levelCheckPassed = false;
                let roleCheckPassed = false;
                let permissonCheckPassed = false;

                permissionOverwriteIfBlock: {
                    if (permissionOverwrite.requiredUsers.length > 0) {
                        userCheckPassed = permissionOverwrite.requiredUsers.includes(member.user.id);

                        if (permissionOverwrite.mode === "AND" && !userCheckPassed) {
                            break permissionOverwriteIfBlock;
                        }

                        if (permissionOverwrite.mode === "OR" && userCheckPassed) {
                            log("User check passed [OR]");
                            break errorRootBlock;
                        }
                    }

                    if (mode === "levels" && permissionOverwrite.requiredLevel !== null) {
                        const { level } = this.client.permissionManager.getMemberPermissionLevel(member);
                        levelCheckPassed = level >= permissionOverwrite.requiredLevel;

                        log("level", level, "<", permissionOverwrite.requiredLevel);

                        if (!levelCheckPassed && permissionOverwrite.mode === "AND") {
                            break permissionOverwriteIfBlock;
                        } else if (levelCheckPassed && permissionOverwrite.mode === "OR") {
                            log("Level check passed [OR]");
                            break errorRootBlock;
                        }
                    }

                    if (permissionOverwrite.requiredPermissions.length > 0) {
                        const requiredPermissions = permissionOverwrite.requiredPermissions as PermissionResolvable[];

                        if (permissionOverwrite.requiredPermissionMode === "OR") {
                            let found = false;

                            for (const permission of requiredPermissions) {
                                if (member.permissions.has(permission, true)) {
                                    found = true;
                                    break;
                                }
                            }

                            permissonCheckPassed = found;

                            if (!found && permissionOverwrite.mode === "AND") {
                                break permissionOverwriteIfBlock;
                            } else if (found && permissionOverwrite.mode === "OR") {
                                log("Permission check passed [OR_OR]");
                                break errorRootBlock;
                            }
                        } else {
                            log(requiredPermissions);
                            permissonCheckPassed = member.permissions.has(requiredPermissions, true);

                            if (!permissonCheckPassed && permissionOverwrite.mode === "AND") {
                                log("Fail");
                                break permissionOverwriteIfBlock;
                            } else if (permissonCheckPassed && permissionOverwrite.mode === "OR") {
                                log("Permission check passed [AND_OR]");
                                break errorRootBlock;
                            }
                        }
                    }

                    if (permissionOverwrite.requiredRoles.length > 0) {
                        roleCheckPassed = member.roles.cache.hasAll(...permissionOverwrite.requiredRoles);

                        if (!roleCheckPassed && permissionOverwrite.mode === "AND") {
                            break permissionOverwriteIfBlock;
                        } else if (roleCheckPassed && permissionOverwrite.mode === "OR") {
                            break errorRootBlock;
                        }
                    }

                    log("userCheckPassed", userCheckPassed);
                    log("levelCheckPassed", levelCheckPassed);
                    log("permissonCheckPassed", permissonCheckPassed);
                    log("roleCheckPassed", roleCheckPassed);

                    if (permissionOverwrite.mode === "OR") {
                        break permissionOverwriteIfBlock;
                    }

                    if (
                        permissionOverwrite.requiredChannels.length > 0 &&
                        !permissionOverwrite.requiredChannels.includes(message.channelId!)
                    ) {
                        await message.reply({
                            content: `${this.emoji("error")} This command is disabled in this channel.`,
                            ephemeral: true
                        });
                        onAbort?.();

                        return;
                    }

                    break errorRootBlock;
                }

                await message.reply({
                    content: `${this.emoji("error")} You don't have enough permissions to run this command.`,
                    ephemeral: true
                });
                onAbort?.();

                return;
            }
        }

        if (context.isLegacy) {
            if (this.subCommandCheck && !this.subcommands.includes(context.args[0])) {
                this.error(
                    message,
                    `Please provide a valid subcommand! The valid subcommands are \`${this.subcommands.join("`, `")}\`.`
                );
                onAbort?.();
                return;
            }

            let index = 0,
                ruleIndex = 0;

            loop: for await (const rule of validationRules) {
                const arg = context.args[index];

                if (arg === undefined) {
                    if (!rule.optional) {
                        await this.error(message, rule.requiredErrorMessage ?? `Argument #${index} is required`);
                        onAbort?.();
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
                                ((rule.minValue !== undefined && rule.minValue > float) ||
                                    (rule.maxValue !== undefined && rule.maxValue < float))
                            ) {
                                await message.reply(
                                    rule.minMaxErrorMessage ??
                                        `Argument #${index} has a min/max numeric value range but the given value is out of range.`
                                );
                                onAbort?.();
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
                                                content: `${this.emoji("error")} ${error}`
                                            })
                                            .catch(logError);

                                        onAbort?.();
                                        return;
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
                                    onAbort?.();
                                    return;
                                }

                                parsedArgs[index] = result;
                                break;

                            case ArgumentType.Link:
                                try {
                                    parsedArgs[index] = new URL(arg);

                                    if (rule.rawLinkString) {
                                        parsedArgs[index] = arg.trim();
                                    }
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

                                    if (ruleIndex >= rule.types.length - 1) {
                                        log(ruleIndex, rule.types.length);

                                        if (rule.entityNotNull) {
                                            await message.reply(
                                                `${this.emoji("error")} ` + rule.entityNotNullErrorMessage ??
                                                    `Argument ${index} is invalid`
                                            );
                                            onAbort?.();
                                            return;
                                        }

                                        parsedArgs[index] = null;
                                    } else if (rule.entityNotNull) {
                                        break;
                                    }
                                }

                                break;

                            case ArgumentType.StringRest:
                                if (arg.trim() === "") break;

                                let str = ((message as Message).content ?? "")
                                    .slice(context.prefix.length)
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

                        if (
                            rule.lengthMax !== undefined &&
                            typeof parsedArgs[index] === "string" &&
                            parsedArgs[index].length > rule.lengthMax
                        ) {
                            await message.reply(
                                `${this.emoji("error")} ` + rule.lengthMaxErrorMessage ?? `Argument #${index} is too long`
                            );
                            onAbort?.();
                            return;
                        }

                        if (prevLength !== parsedArgs.length) {
                            break;
                        }
                    }

                    if (prevLengthOuter === parsedArgs.length) {
                        await message.reply(
                            `${this.emoji("error")} ` + rule.typeErrorMessage ?? `Argument #${index} is invalid, type mismatch`
                        );
                        onAbort?.();
                        return;
                    }
                }

                if (rule.name) {
                    parsedNamedArgs[rule.name] = parsedArgs[index];
                }

                index++;
                ruleIndex++;
            }
        }

        if (!checkOnly) {
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
}
