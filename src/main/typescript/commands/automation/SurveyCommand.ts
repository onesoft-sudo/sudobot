import { ActionRowBuilder, ButtonBuilder, HeadingLevel } from "@discordjs/builders";
import { TakesArgument } from "@framework/arguments/ArgumentTypes";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import StringArgument from "@framework/arguments/StringArgument";
import type { Buildable } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { ButtonStyle, heading } from "discord.js";

type SurveyCommandArgs = {
    name: string;
};

@TakesArgument<SurveyCommandArgs>({
    names: ["name"],
    types: [StringArgument],
    optional: false,
    errorMessages: [
        {
            [ErrorType.Required]: "Please provide a survey name to send!"
        }
    ]
})
class SurveyCommand extends Command {
    public override readonly name = "survey";
    public override readonly description: string = "Shows a survey form to fill out.";
    public override readonly defer = true;
    public override readonly usage = ["<name: String>"];

    public override build(): Buildable[] {
        return [
            this.buildChatInput().addStringOption(option =>
                option
                    .setName("name")
                    .setDescription("The name of the survey to send.")
                    .setRequired(true)
            )
        ];
    }

    public override async execute(context: Context, args: SurveyCommandArgs): Promise<void> {
        const { name } = args;

        const survey = context.config?.survey_system?.surveys[name];

        if (!survey) {
            await context.error("This survey does not exist.");
            return;
        }

        await context.reply({
            ephemeral: true,
            content: `${heading(survey.name, HeadingLevel.Two)}\n\n${
                survey.description ?? "Please fill out the form by clicking the button below."
            }`,
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId("survey_" + name)
                        .setLabel("Fill out survey")
                        .setStyle(ButtonStyle.Secondary)
                )
            ]
        });
    }
}

export default SurveyCommand;
