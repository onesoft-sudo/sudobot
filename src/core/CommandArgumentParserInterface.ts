import { Awaitable, Message } from "discord.js";

export type ParsingState = {
    argv: string[];
    args: string[];
    parsedArgs: Record<string | number, any>;
    index: number;
    currentArg: string | undefined;
    rule: ValidationRule;
    parseOptions: ParseOptions;
    type: ArgumentType;
};

export enum ArgumentType {
    String,
    Number,
    Integer,
    Float,
    User,
    Role,
    Member,
    Channel,
    StringRest,
    Snowflake,
    Link,
    TimeInterval
}

export type ValidationErrorType =
    | "required"
    | "type:invalid"
    | "entity:null"
    | "number:range:min"
    | "number:range:max"
    | "number:range"
    | "time:range:min"
    | "time:range:max"
    | "time:range"
    | "string:length:min"
    | "string:length:max"
    | "string:rest:length:min"
    | "string:rest:length:max"
    | "string:empty";

export type ValidationRuleErrorMessages = { [K in ValidationErrorType]?: string };
export type ValidationRule = {
    types: readonly ArgumentType[];
    optional?: boolean;
    default?: any;
    name?: string;
    errors?: ValidationRuleErrorMessages;
    number?: {
        min?: number;
        max?: number;
    };
    string?: {
        maxLength?: number;
        minLength?: number;
        notEmpty?: boolean;
    };
    time?: {
        unit?: "ms" | "s";
        min?: number;
        max?: number;
    };
    link?: {
        urlObject?: boolean;
    };
    entity?:
        | boolean
        | {
              notNull?: boolean;
          };
};

export type ParseOptions = {
    input: string;
    message?: Message;
    rules: readonly ValidationRule[];
    prefix: string;
};

export enum ParserJump {
    Next,
    Break,
    Steps
}

export type ParseResult<T = any> = {
    jump?: ParserJump;
    steps?: number;
    result?: T;
};

export default interface CommandArgumentParserInterface {
    parse(options: ParseOptions): Awaitable<Record<string | number, any>>;
}
