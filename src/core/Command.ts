import { APIMessage, CacheType, Channel, ChatInputCommandInteraction, InteractionReplyOptions, Message, MessageCreateOptions, MessageMentions, PermissionResolvable, Role, Snowflake, User } from "discord.js";
import { ChatInputCommandContext, LegacyCommandContext } from "../services/CommandManager";
import { isSnowflake } from "../utils/utils";
import Client from "./Client";

export type CommandMessage = Message<boolean> | ChatInputCommandInteraction<CacheType>;
export type AnyCommandContext = LegacyCommandContext | ChatInputCommandContext;
export type CommandReturn = ((MessageCreateOptions | APIMessage | InteractionReplyOptions) & { __reply?: boolean }) | undefined | null | void;

// TODO: Complete this
export enum ArgumentType {
    String = 1,
    Number,
    Integer,
    Float,
    Boolean,
    Snowflake,
    User,
    Channel,
    Role,
    Link
}

export type ArgumentTypeFromEnum<D extends ArgumentType> = D extends ArgumentType.Boolean ? boolean : (
    D extends (ArgumentType.Number | ArgumentType.Integer | ArgumentType.Float) ? number : (
        D extends (ArgumentType.String | ArgumentType.Link) ? string : (
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
}

export default abstract class Command {
    public readonly name: string = '';
    public readonly group: string = '';
    public readonly aliases: string[] = [];

    public readonly supportsInteractions: boolean = true;
    public readonly supportsLegacy: boolean = true;

    public readonly permissions: PermissionResolvable[] = [];
    public readonly validationRules: ValidationRule[] = [];

    constructor(protected client: Client) { }
    abstract execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn>;

    private async invalidValue(message: CommandMessage, index: number, typename: string) {
        return await message.reply(`Argument #${index}: Invalid ${typename} value given`);
    }

    async run(message: CommandMessage, context: AnyCommandContext) {
        const { validationRules } = this;
        const parsedArgs = [];

        if (context.isLegacy) {
            let index = 0;

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