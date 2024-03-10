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

import { SlashCommandBuilder } from "discord.js";
import Command, {
    ArgumentType,
    BasicCommandContext,
    CommandMessage,
    CommandReturn,
    ValidationRule
} from "../../core/Command";

export default class BallotCommand extends Command {
    public readonly name = "ballot";
    public readonly subcommands = ["create", "delete", "view", "votelist"];
    public readonly subCommandCheck = true;
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.String],
            errors: {
                required: `Please provide a valid subcommand! The valid commands are: \`${this.subcommands.join(
                    "`, `"
                )}\``,
                "type:invalid": "Please provide a valid subcommand!"
            },
            name: "subcommand"
        }
    ];
    public readonly permissions = [];
    public readonly aliases = ["poll"];
    public readonly description = "Create and manage ballots/polls.";
    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addSubcommand(subcommand =>
            subcommand
                .setName("create")
                .setDescription("Sends a poll/ballot embed")
                .addStringOption(option =>
                    option
                        .setName("content")
                        .setDescription("The ballot/poll content")
                        .setRequired(true)
                )
                .addBooleanOption(option =>
                    option
                        .setName("anonymous")
                        .setDescription(
                            "Anonymous mode won't show your name in the ballot. Default is true"
                        )
                )
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription(
                            "The channel where the message will be sent, defaults to the current channel"
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("view")
                .setDescription("Shows a poll/ballot")
                .addIntegerOption(option =>
                    option.setName("id").setDescription("The ballot ID").setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("votelist")
                .setDescription("Shows a list of each vote in a poll/ballot")
                .addIntegerOption(option =>
                    option.setName("id").setDescription("The ballot ID").setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("mode")
                        .setDescription("Determines what kind of data is shown")
                        .setChoices(
                            {
                                name: "All Votes",
                                value: "all"
                            },
                            {
                                name: "Upvotes",
                                value: "upvotes"
                            },
                            {
                                name: "Downvotes",
                                value: "downvotes"
                            }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("delete")
                .setDescription("Deletes a poll/ballot")
                .addIntegerOption(option =>
                    option.setName("id").setDescription("The ballot ID").setRequired(true)
                )
        );

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        const subcommand = context.isLegacy
            ? context.parsedNamedArgs.subcommand
            : context.options.getSubcommand(true);
        const command = this.client.commands.get(`ballot__${subcommand}`);

        if (!command) {
            await this.error(message, this.validationRules[0].errors!.required!);
            return;
        }

        if (context.isLegacy) context.args.shift();

        return await command.execute(message, context);
    }
}
