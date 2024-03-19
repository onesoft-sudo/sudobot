import { Awaitable, ChatInputCommandInteraction } from "discord.js";
import Argument from "./Argument";
import { ErrorType } from "./InvalidArgumentError";

class RestStringArgument extends Argument<string> {
    public override toString(): string {
        return this.getValue();
    }

    public override transform() {
        let content = this.commandContent.trim();
        let i = 0;

        for (const arg of this.argv) {
            content = content.slice(arg.length).trimStart();

            if (i === this.position) {
                break;
            }

            i++;
        }

        return content.trimEnd();
    }

    public override postTransformValidation(): boolean {
        if (!this.transformedValue) {
            return this.error("Invalid argument received", ErrorType.InvalidType);
        }

        return true;
    }

    protected override resolveFromInteraction(
        interaction: ChatInputCommandInteraction
    ): Awaitable<string> {
        const value = interaction.options.getString(this.name!, this.isRequired);

        if (value === null) {
            return this.error(`${this.name} is required!`, ErrorType.Required);
        }

        return value;
    }
}

export default RestStringArgument;
