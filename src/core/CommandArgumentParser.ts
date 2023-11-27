import { Awaitable, Client, GuildBasedChannel, GuildMember, Role, SnowflakeUtil, User } from "discord.js";
import { stringToTimeInterval } from "../utils/datetime";
import { logWarn } from "../utils/logger";
import CommandArgumentParserInterface, {
    ArgumentType,
    ParseOptions,
    ParseResult,
    ParserJump,
    ParsingState,
    ValidationErrorType
} from "./CommandArgumentParserInterface";

class ArgumentParseError extends Error {
    constructor(message: string, public readonly type: ValidationErrorType | ValidationErrorType[]) {
        super(`[${type}]: ${message}`);
    }
}

export default class CommandArgumentParser implements CommandArgumentParserInterface {
    protected readonly parsers: Record<ArgumentType, Extract<keyof CommandArgumentParser, `parse${string}Type`>> = {
        [ArgumentType.String]: "parseStringType",
        [ArgumentType.Snowflake]: "parseSnowflakeType",
        [ArgumentType.StringRest]: "parseStringRestType",
        [ArgumentType.Channel]: "parseEntityType",
        [ArgumentType.User]: "parseEntityType",
        [ArgumentType.Role]: "parseEntityType",
        [ArgumentType.Member]: "parseEntityType",
        [ArgumentType.Float]: "parseNumericType",
        [ArgumentType.Integer]: "parseNumericType",
        [ArgumentType.Number]: "parseNumericType",
        [ArgumentType.Link]: "parseLinkType",
        [ArgumentType.TimeInterval]: "parseTimeIntervalType"
    };

    constructor(protected readonly client: Client) {}

    parseTimeIntervalType(state: ParsingState): Awaitable<ParseResult<number>> {
        const { result, error } = stringToTimeInterval(state.currentArg!, {
            milliseconds: state.rule.time?.unit === "ms"
        });

        if (error) {
            throw new ArgumentParseError(`Error occurred while parsing time interval: ${error}`, "type:invalid");
        }

        const max = state.rule.time?.max;
        const min = state.rule.time?.min;

        if (min !== undefined && result > min) {
            throw new ArgumentParseError("Time interval is less than the minimum limit", ["time:range:min", "time:range"]);
        } else if (max !== undefined && result > max) {
            throw new ArgumentParseError("Time interval has exceeded the maximum limit", ["time:range:max", "time:range"]);
        }

        return {
            result
        };
    }

    parseLinkType(state: ParsingState): Awaitable<ParseResult<string | URL>> {
        try {
            const url = new URL(state.currentArg!);

            return {
                result: state.rule.link?.urlObject ? url : state.currentArg!
            };
        } catch (error) {
            throw new ArgumentParseError("Invalid URL", "type:invalid");
        }
    }

    parseNumericType(state: ParsingState): Awaitable<ParseResult<number>> {
        const number =
            state.type === ArgumentType.Float || state.currentArg!.includes(".")
                ? parseFloat(state.currentArg!)
                : parseInt(state.currentArg!);

        if (isNaN(number)) {
            throw new ArgumentParseError("Invalid numeric value", "type:invalid");
        }

        const max = state.rule.number?.max;
        const min = state.rule.number?.min;

        if (min !== undefined && number > min) {
            throw new ArgumentParseError("Numeric value is less than the minimum limit", ["number:range:min", "number:range"]);
        } else if (max !== undefined && number > max) {
            throw new ArgumentParseError("Numeric value exceeded the maximum limit", ["number:range:max", "number:range"]);
        }

        return {
            result: number
        };
    }

    async parseEntityType(state: ParsingState): Promise<ParseResult<GuildBasedChannel | User | Role | GuildMember | null>> {
        let id = state.currentArg!;

        if (!id.startsWith("<") && !id.endsWith(">") && !/^\d+$/.test(id)) {
            throw new ArgumentParseError("Invalid entity ID", ["type:invalid"]);
        }

        switch (state.type) {
            case ArgumentType.Role:
                id = id.startsWith("<@&") && id.endsWith(">") ? id.substring(3, id.length - 1) : id;
                break;

            case ArgumentType.Member:
            case ArgumentType.User:
                id = id.startsWith("<@") && id.endsWith(">") ? id.substring(id.includes("!") ? 3 : 2, id.length - 1) : id;
                break;

            case ArgumentType.Channel:
                id = id.startsWith("<#") && id.endsWith(">") ? id.substring(2, id.length - 1) : id;
                break;

            default:
                logWarn("parseEntityType logic error: used as unsupported argument type handler");
        }

        try {
            const entity = await (state.type === ArgumentType.Channel
                ? state.parseOptions.message?.guild?.channels.fetch(id)
                : state.type === ArgumentType.Member
                ? state.parseOptions.message?.guild?.members.fetch(id)
                : state.type === ArgumentType.Role
                ? state.parseOptions.message?.guild?.roles.fetch(id)
                : state.type === ArgumentType.User
                ? this.client.users.fetch(id)
                : null);

            if (!entity) {
                throw new Error();
            }

            return {
                result: entity
            };
        } catch (error) {
            if (state.rule.entity === true || (typeof state.rule.entity === "object" && state.rule.entity?.notNull)) {
                throw new ArgumentParseError("Failed to fetch entity", "entity:null");
            }

            return {
                result: null
            };
        }
    }

    parseStringType(state: ParsingState): Awaitable<ParseResult<string | null>> {
        this.validateStringType(state);

        return {
            result: state.currentArg == "" ? null : state.currentArg
        };
    }

    parseSnowflakeType(state: ParsingState): Awaitable<ParseResult<string>> {
        try {
            SnowflakeUtil.decode(state.currentArg!);
        } catch (error) {
            throw new ArgumentParseError("The snowflake argument is invalid", "type:invalid");
        }

        return {
            result: state.currentArg
        };
    }

    parseStringRestType(state: ParsingState): Awaitable<ParseResult<string>> {
        this.validateStringType(state, ["string:rest", "string"]);

        let string = state.parseOptions.input.trim().substring(state.parseOptions.prefix.length).trim();

        for (let i = 0; i < Object.keys(state.parsedArgs).length + 1; i++) {
            string = string.trim().substring(state.argv[i].length);
        }

        string = string.trim();

        return {
            result: string,
            jump: ParserJump.Break
        };
    }

    private validateStringType(state: ParsingState, prefixes: ("string" | "string:rest")[] = ["string"]) {
        if (
            (state.rule.string?.notEmpty || !state.rule.optional) &&
            !state.currentArg?.trim() &&
            prefixes.length === 1 &&
            prefixes.includes("string")
        )
            throw new ArgumentParseError(
                "The string must not be empty",
                !state.rule.optional ? `required` : `${prefixes[0] as "string"}:empty`
            );
        else if (state.rule.string?.minLength !== undefined && (state.currentArg?.length ?? 0) < state.rule.string.minLength)
            throw new ArgumentParseError(
                "The string is too short",
                prefixes.map(prefix => `${prefix}:length:min` as const)
            );
        else if (state.rule.string?.maxLength !== undefined && (state.currentArg?.length ?? 0) > state.rule.string.maxLength)
            throw new ArgumentParseError(
                "The string is too long",
                prefixes.map(prefix => `${prefix}:length:max` as const)
            );
    }

    async parse(parseOptions: ParseOptions) {
        const { input, rules } = parseOptions;
        const parsedArgs: Record<string | number, any> = {};
        const argv = input.split(/\s+/);
        const args = [...argv];

        args.shift();

        const state = {
            argv,
            args,
            parsedArgs,
            index: 0,
            currentArg: args[0],
            rule: rules[0],
            parseOptions
        } as ParsingState;

        let counter = 0;

        ruleLoop: for (state.index = 0; state.index < rules.length; state.index++) {
            const rule = rules[state.index];
            state.currentArg = state.args[state.index];
            state.rule = rules[state.index];

            let result = null,
                lastError: ArgumentParseError | null = null;

            if (!state.currentArg) {
                if (!rule.optional) {
                    return { error: rule.errors?.["required"] ?? `Argument #${state.index} is required` };
                } else if (rule.default !== undefined) {
                    result = {
                        result: rule.default
                    } satisfies ParseResult;
                }

                state.parsedArgs[rule.name ?? counter++] = result?.result ?? null;
                continue;
            }

            for (const type of rule.types) {
                const parser = this.parsers[type];
                const handler = this[parser] as Function;

                if (!parser || !handler) {
                    throw new Error(`Parser for type "${ArgumentType[type]}" is not implemented.`);
                }

                state.type = type;

                try {
                    result = await handler.call(this, state);
                    lastError = null;
                } catch (error) {
                    if (error instanceof ArgumentParseError) {
                        lastError = error;
                    }
                }

                if (!lastError) {
                    break;
                }

                if (result?.jump === ParserJump.Break) break ruleLoop;
                else if (result?.jump === ParserJump.Next) continue ruleLoop;
                else if (result?.jump === ParserJump.Steps) {
                    state.index += result?.steps ?? 1;
                    break;
                }
            }

            if (lastError) {
                let errorMessage: string | undefined;

                if (typeof lastError.type === "string") {
                    errorMessage = rule.errors?.[lastError.type];
                } else {
                    for (const type of lastError.type) {
                        errorMessage = rule.errors?.[type];

                        if (errorMessage) {
                            break;
                        }
                    }
                }

                return { error: errorMessage ?? lastError.message };
            }

            if (!result) {
                return { error: `Failed to parse argument #${state.index}` };
            }

            state.parsedArgs[rule.name ?? counter++] = result.result;
        }

        return {
            parsedArgs
        };
    }
}
