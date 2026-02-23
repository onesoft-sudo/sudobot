/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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

import type Directive from "@framework/directives/Directive";
import DirectiveParseError from "@framework/directives/DirectiveParseError";
import type { Class } from "@framework/types/Utils";
import { isAlpha } from "@framework/utils/string";
import JSON5 from "json5";

class DirectiveParser {
    private readonly availableDirectives: Array<Directive> = [];

    public constructor(directives: Array<Class<Directive>>) {
        directives.forEach(directive => this.registerDirective(directive));
    }

    public registerDirective(directive: Class<Directive>) {
        this.availableDirectives.push(new directive());
    }

    public async parse(input: string, silent = true) {
        const state = {
            input,
            output: input,
            data: {} as Record<string, unknown>,
            currentArgument: undefined as string | undefined
        };

        for (let i = 0; i < input.length; i++) {
            if (input[i] !== "@") {
                continue;
            }

            let name = "";

            while (isAlpha(input[i + name.length + 1])) {
                name += input[i + name.length + 1];
            }

            if (!name) {
                continue;
            }

            const sliced = input.slice(i + name.length + 1).trim();
            const directive = this.availableDirectives.find(d => d.name === name);

            if (!directive) {
                continue;
            }

            let arg;
            let length: number;

            try {
                const { json, length: computedLength, str } = this.getNextJSON5Literal(sliced, name);
                arg = json;
                length = computedLength;
                state.currentArgument = str;
            }
            catch (error) {
                if (!silent) {
                    throw error;
                }

                continue;
            }

            await directive.apply(this, state, arg);
            i += name.length + 1 + length - 1;
            state.currentArgument = undefined;
        }

        return state;
    }

    public getNextJSON5Literal(input: string, directiveName: string) {
        const start = input.indexOf("{");
        let end = start + 1;
        let depth = 1;

        while (depth > 0) {
            if (input[end] === "{") {
                depth++;
            }
            else if (input[end] === "}") {
                depth--;
            }
            else if (input[end] === undefined) {
                throw new DirectiveParseError("Unexpected end of input");
            }
            else if (input[end] === '"') {
                end = input.indexOf('"', end + 1);
            }
            else if (input[end] === "'") {
                end = input.indexOf("'", end + 1);
            }

            if (end === -1) {
                throw new DirectiveParseError("Unexpected end of input");
            }

            end++;
        }

        const str = input.slice(start, end);

        try {
            return {
                json: JSON5.parse<Record<string, unknown>>(str),
                length: str.length,
                str
            };
        } catch (error) {
            throw new DirectiveParseError("Failed to parse JSON5 literal in directive: " + directiveName, {
                cause: error
            });
        }
    }
}

export default DirectiveParser;
