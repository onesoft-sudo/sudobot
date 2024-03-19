import { Awaitable, ChatInputCommandInteraction } from "discord.js";
import Argument from "./Argument";
import { ErrorType } from "./InvalidArgumentError";

class StringArgument extends Argument<string> {
    public override toString(): string {
        return this.getValue();
    }

    public override validate(): boolean {
        if (!this.stringValue!.length) {
            return this.error("String cannot be empty", ErrorType.InvalidType);
        }

        return true;
    }

    public override transform() {
        return this.stringValue;
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

export default StringArgument;
