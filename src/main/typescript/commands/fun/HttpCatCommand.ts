import { ArgumentSchema } from "@framework/arguments/ArgumentTypes";
import IntegerArgument from "@framework/arguments/IntegerArgument";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import type { Buildable } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import axios from "axios";

type HttpCatCommandArgs = {
    status: number;
};

@ArgumentSchema.Definition({
    names: ["status"],
    types: [IntegerArgument],
    optional: false,
    errorMessages: [
        {
            [ErrorType.InvalidType]: "The status argument must be a valid HTTP status code.",
            [ErrorType.Required]: "The status argument is required.",
            [ErrorType.InvalidRange]: "The status argument must be a valid HTTP status code."
        }
    ],
    rules: [
        {
            "range:max": 599,
            "range:min": 100
        }
    ]
})
class HttpCatCommand extends Command {
    public override readonly name: string = "httpcat";
    public override readonly description: string = "Get a cat image for a given HTTP status code.";
    public override readonly defer = true;
    public override readonly usage = ["<code>"];

    public override build(): Buildable[] {
        return [
            this.buildChatInput().addIntegerOption(option =>
                option
                    .setName("code")
                    .setDescription("The HTTP status code.")
                    .setMinValue(100)
                    .setMaxValue(599)
                    .setRequired(true)
            )
        ];
    }

    public override async execute(context: Context, args: HttpCatCommandArgs): Promise<void> {
        const { status } = args;
        const url = `https://http.cat/${status}`;

        try {
            await axios.get(url);
        } catch (error) {
            await context.error("No cat found for that status code.");
            return;
        }

        await context.reply({
            files: [url]
        });
    }
}

export default HttpCatCommand;
