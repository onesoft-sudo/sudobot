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
    | "number:invalid"
    | "string:length:min"
    | "string:length:max"
    | "string:rest:length:min"
    | "string:rest:length:max"
    | "string:empty"
    | "snowflake:invalid"
    | "url:invalid"
    | "time:invalid";

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
        unit?: 'ms' | 's';
    };
    link?: {
        urlObject?: boolean;
    };
    entity?: {
        allowNull?: boolean;
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