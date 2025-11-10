import type { ArgumentSchema } from "@framework/arguments/ArgumentSchema";
import StringArgument from "@framework/arguments/StringArgument";
import Command from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { codeBlock, MessageFlags } from "discord.js";

class AboutCommand extends Command {
    public override readonly name: string = "test";
    public override argumentSchema = {
        overloads: [
            {
                definitions: [
                    {
                        name: "long",
                        type: StringArgument,
                        rules: {
                            "range:min": 4
                        }
                    }
                ]
            },
            {
                definitions: [
                    {
                        name: "short",
                        type: StringArgument,
                        rules: {
                            "range:max": 4
                        }
                    }
                ]
            }
        ]
    } satisfies ArgumentSchema;

    public override async execute(context: Context, _args: Readonly<Record<string, unknown>>): Promise<void> {
        await context.reply({
            content: codeBlock(
                "typescript",
                this.argumentParser.overloadSignatureToString(this.argumentSchema.overloads[0])
            ),
            flags: [MessageFlags.Ephemeral]
        });
    }
}

export default AboutCommand;
