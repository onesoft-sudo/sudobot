import type DirectiveParser from "@framework/directives/DirectiveParser";
import type { Awaitable } from "discord.js";

export type ParserState = {
    output: string;
    input: string;
    data: Record<string, unknown>;
};

abstract class Directive {
    public abstract readonly name: string;

    public abstract apply(
        parser: DirectiveParser,
        parserState: ParserState,
        arg: string
    ): Awaitable<void>;
}

export default Directive;
