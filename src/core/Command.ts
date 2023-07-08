import { APIMessage, CacheType, Channel, ChatInputCommandInteraction, GuildMember, InteractionEditReplyOptions, InteractionReplyOptions, Message, MessageCreateOptions, MessageMentions, MessagePayload, PermissionResolvable, Role, Snowflake, User } from "discord.js";
import { dirname } from "path";
import { ChatInputCommandContext, LegacyCommandContext } from "../services/CommandManager";
import { isSnowflake, stringToTimeInterval } from "../utils/utils";
import Client from "./Client";

export type CommandMessage = Message<boolean> | ChatInputCommandInteraction<CacheType>;
export type AnyCommandContext = LegacyCommandContext | ChatInputCommandContext;
export type CommandReturn = ((MessageCreateOptions | APIMessage | InteractionReplyOptions) & { __reply?: boolean }) | undefined | null | void;

// TODO: Complete this
export enum ArgumentType {
    String = 1,
    StringRest,
    Number,
    Integer,
    Float,
    Boolean,
    Snowflake,
    User,
    Channel,
    Role,
    Link,
    TimeInterval
}

export type ArgumentTypeFromEnum<D extends ArgumentType> = D extends ArgumentType.Boolean ? boolean : (
    D extends (ArgumentType.Number | ArgumentType.Integer | ArgumentType.Float | ArgumentType.TimeInterval) ? number : (
        D extends (ArgumentType.String | ArgumentType.StringRest | ArgumentType.Link) ? string : (
            D extends ArgumentType.Snowflake ? Snowflake : (
                D extends ArgumentType.User ? User : (
                    D extends ArgumentType.Role ? Role : (
                        D extends ArgumentType.Channel ? Channel : never
                    )
                )
            )
        )
    )
);

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
}

export default abstract class Command {
    public readonly name: string = '';
    public readonly group: string = dirname(__dirname);
    public readonly aliases: string[] = [];

    public readonly supportsInteractions: boolean = true;
    public readonly supportsLegacy: boolean = true;

    public readonly permissions: PermissionResolvable[] = [];
    public readonly validationRules: ValidationRule[] = [];

    constructor(protected client: Client) { }
    abstract execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn>;

    async deferredReply(message: CommandMessage, options: MessageCreateOptions | MessagePayload | InteractionEditReplyOptions | string) {
        if (message instanceof ChatInputCommandInteraction) {
            return await message.editReply(options);
        }

        return message.reply(options as any);
    }

    async run(message: CommandMessage, context: AnyCommandContext) {
        const { validationRules, permissions } = this;
        const parsedArgs = [];

        if (permissions.length > 0) {
            let member: GuildMember = <any>message.member!;

            if (!(member.permissions as any)?.has) {
                try {
                    member = await message.guild!.members.fetch(member.user.id);

                    if (!member) {
                        throw new Error("Invalid member");
                    }
                }
                catch (e) {
                    console.log(e);
                    message.reply({
                        content: `Sorry, I couldn't determine whether you have the enough permissions to perform this action or not. Please contact the bot developer.`,
                        ephemeral: true
                    }).catch(console.error);
                    return;
                }
            }

            for (const permission of permissions) {
                if (!member.permissions.has(permission, true)) {
                    await message.reply({
                        content: `You don't have permission to run this command.`,
                        ephemeral: true
                    });

                    return;
                }
            }
        }

        if (context.isLegacy) {
            let index = 0;

            loop:
            for await (const rule of validationRules) {
                const arg = context.args[index];

                if (arg === undefined) {
                    if (!rule.optional) {
                        await message.reply(rule.requiredErrorMessage ?? `Argument #${index} is required`);
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

                        if (/^(\-)?[\d\.]+$/.test(arg) && ((rule.minValue || rule.maxValue) && type === ArgumentType.Float || type === ArgumentType.Integer || type === ArgumentType.Number)) {
                            const float = parseFloat(arg);

                            if (!isNaN(float) && ((rule.minValue !== undefined && rule.minValue > float) || (rule.maxValue !== undefined && rule.maxValue < float))) {
                                await message.reply(rule.minMaxErrorMessage ?? `Argument #${index} has a min/max numeric value range but the given value is out of range.`);
                                return;
                            }
                        }

                        switch (type) {
                            case ArgumentType.Boolean:
                                if (['true', 'false'].includes(arg.toLowerCase())) {
                                    parsedArgs[index] = arg.toLowerCase() === 'true';
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
                                const { seconds, error } = stringToTimeInterval(arg);

                                if (error) {
                                    if (rule.types.length === 1) {
                                        await message.reply({
                                            ephemeral: true,
                                            content: error
                                        }).catch(console.error);
                                    }

                                    break;
                                }

                                if (!isNaN(seconds) && ((rule.minValue !== undefined && rule.minValue > seconds) || (rule.maxValue !== undefined && rule.maxValue < seconds))) {
                                    await message.reply(rule.minMaxErrorMessage ?? `Argument #${index} has a min/max numeric time value range but the given value is out of range.`);
                                    return;
                                }

                                parsedArgs[index] = seconds;
                                break;

                            case ArgumentType.String:
                                if (arg.trim() === '')
                                    break;

                                parsedArgs[index] = arg;
                                break;

                            case ArgumentType.Snowflake:
                                if (!isSnowflake(arg))
                                    break;

                                parsedArgs[index] = arg;
                                break;

                            case ArgumentType.User:
                            case ArgumentType.Channel:
                            case ArgumentType.Role:
                                let id;

                                if (MessageMentions.UsersPattern.test(arg)) {
                                    id = arg.substring(arg.includes("!") ? 3 : 2, arg.length - 1);
                                }
                                else if (MessageMentions.ChannelsPattern.test(arg)) {
                                    id = arg.substring(2, arg.length - 1);
                                }
                                else if (MessageMentions.RolesPattern.test(arg)) {
                                    id = arg.substring(3, arg.length - 1);
                                }
                                else if (isSnowflake(arg)) {
                                    id = arg;
                                }
                                else {
                                    break;
                                }

                                try {
                                    let entity = null;

                                    if (type === ArgumentType.User)
                                        entity = await this.client.users.fetch(id)
                                    else {
                                        entity = type === ArgumentType.Role ?
                                            await message.guild!.roles.fetch(id) :
                                            await message.guild!.channels.fetch(id);
                                    }

                                    if (!entity) {
                                        throw new Error("Invalid entity received");
                                    }

                                    parsedArgs[index] = entity;
                                }
                                catch (e) {
                                    console.log(e);

                                    if (rule.entityNotNull) {
                                        await message.reply(rule.entityNotNullErrorMessage ?? `Argument ${index} is invalid`);
                                        return;
                                    }

                                    parsedArgs[index] = null;
                                }

                                break;

                            case ArgumentType.StringRest:
                                if (arg.trim() === '')
                                    break;

                                const config = this.client.configManager.config[message.guildId!];
                                let str = ((message as Message).content ?? '')
                                    .slice(config?.prefix.length)
                                    .trimStart()
                                    .slice(context.argv[0].length)
                                    .trimStart();

                                for (let i = 0; i < index; i++) {
                                    str = str.slice(context.args[i].length).trimStart();
                                }

                                str = str.trimEnd();

                                if (str === '')
                                    break;

                                parsedArgs[index] = str;
                                break loop;
                        }

                        if (rule.lengthMax !== undefined && typeof parsedArgs[index] === 'string' && parsedArgs[index].length > rule.lengthMax) {
                            await message.reply(rule.lengthMaxErrorMessage ?? `Argument #${index} is too long`);
                            return;
                        }

                        if (prevLength !== parsedArgs.length) {
                            break;
                        }
                    }

                    if (prevLengthOuter === parsedArgs.length) {
                        await message.reply(rule.typeErrorMessage ?? `Argument #${index} is invalid, type mismatch`);
                        return;
                    }
                }

                index++;
            }
        }

        return await this.execute(message, {
            ...context,
            ...(context.isLegacy ? {
                parsedArgs
            } : {})
        });
    }
}