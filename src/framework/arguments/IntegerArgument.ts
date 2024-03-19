import { Awaitable, ChatInputCommandInteraction } from "discord.js";
import { ErrorType } from "./InvalidArgumentError";
import NumberArgument from "./NumberArgument";

class IntegerArgument extends NumberArgument {
    public override postTransformValidation(): boolean {
        if (!Number.isInteger(this.transformedValue)) {
            return this.error("Number must be an integer", ErrorType.InvalidType);
        }

        return super.postTransformValidation();
    }

    public override transform(): number {
        return parseInt(this.stringValue);
    }

    protected override resolveFromInteraction(
        interaction: ChatInputCommandInteraction
    ): Awaitable<number> {
        const value = interaction.options.getInteger(this.name!, this.isRequired);

        if (value === null) {
            return this.error(`${this.name} is required!`, ErrorType.Required);
        }

        return value;
    }
}

export default IntegerArgument;
