import DirectiveParser from "@framework/directives/DirectiveParser";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import EmbedDirective from "@main/directives/EmbedDirective";

@Name("directiveParsingService")
class DirectiveParsingService extends Service {
    private readonly parser = new DirectiveParser([EmbedDirective]);

    public parse(input: string) {
        return this.parser.parse(input);
    }
}

export default DirectiveParsingService;
