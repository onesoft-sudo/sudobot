/**
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
 *
 * SudoBot is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SudoBot is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
 */

import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    HeadingLevel,
    SlashCommandBuilder,
    heading
} from "discord.js";
import Command, {
    ArgumentType,
    BasicCommandContext,
    CommandMessage,
    CommandReturn,
    ValidationRule
} from "../../core/Command";

export default class SurveyCommand extends Command {
    public readonly name = "survey";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.String],
            errors: {
                required: "You must provide a form name to view",
                "type:invalid": "You must provide a form name to view"
            },
            optional: false,
            name: "survey"
        }
    ];
    public readonly aliases = ["form"];

    public readonly description = "Shows a survey form to fill out";
    public readonly slashCommandBuilder = new SlashCommandBuilder().addStringOption(option =>
        option.setName("survey").setDescription("The survey name to show").setRequired(true)
    );

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        const id = context.isLegacy
            ? context.parsedNamedArgs.survey
            : context.options.getString("survey", true);
        const survey = context.config.survey?.surveys[id];

        if (!survey) {
            await this.error(message, "This survey does not exist.");
            return;
        }

        await message.reply({
            ephemeral: true,
            content: `${heading(survey.name, HeadingLevel.Two)}\n\n${
                survey.description ?? "Please fill out the form by clicking the button below."
            }`,
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId("survey_" + id)
                        .setLabel("Fill out survey")
                        .setStyle(ButtonStyle.Secondary)
                )
            ]
        });
    }
}
