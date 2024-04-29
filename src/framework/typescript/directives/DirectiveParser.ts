import type Directive from "@framework/directives/Directive";
import type { Class } from "@framework/types/Utils";
import { isAlpha } from "@framework/utils/string";

class DirectiveParser {
    private readonly availableDirectives: Array<Directive> = [];

    public constructor(directives: Array<Class<Directive>>) {
        directives.forEach(directive => this.registerDirective(directive));
    }

    public registerDirective(directive: Class<Directive>) {
        this.availableDirectives.push(new directive());
    }

    public async parse(input: string) {
        const lines = input.trim().split(/\s*\n\s*/);
        const state = {
            lines,
            input,
            output: input,
            data: {} as Record<string, unknown>
        };

        for (const line of lines) {
            if (!line.startsWith("@")) {
                continue;
            }

            let name = "";

            while (isAlpha(line[name.length + 1])) {
                name += line[name.length + 1];
            }

            if (!name) {
                continue;
            }

            if (!line.endsWith(")")) {
                continue;
            }

            const sliced = line.slice(name.length + 1).trim();
            const arg = sliced.slice(1, sliced.length - 1);
            const directive = this.availableDirectives.find(d => d.name === name);

            if (!directive) {
                continue;
            }

            await directive.apply(this, state, arg);
        }

        return state;
    }
}

export default DirectiveParser;
