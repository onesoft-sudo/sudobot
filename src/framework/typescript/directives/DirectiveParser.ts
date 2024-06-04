import type Directive from "@framework/directives/Directive";
import type { Class } from "@framework/types/Utils";
import { isAlpha } from "@framework/utils/string";
import DirectiveParseError from "@framework/directives/DirectiveParseError";
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
            let length = 0;

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
            } else if (input[end] === "}") {
                depth--;
            }
            else if (input[end] === undefined) {
                throw new DirectiveParseError("Unexpected end of input");
            }
            else if (input[end] === "\"") {
                end = input.indexOf("\"", end + 1);
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
                json: JSON5.parse(str),
                length: str.length,
                str
            };
        }
        catch (error) {
            throw new DirectiveParseError("Failed to parse JSON5 literal in directive: " + directiveName, {
                cause: error
            });
        }
    }
}

export default DirectiveParser;
