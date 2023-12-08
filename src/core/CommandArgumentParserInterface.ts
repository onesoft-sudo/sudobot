/*
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
