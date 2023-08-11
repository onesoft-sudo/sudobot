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

import { PermissionsBitField, SlashCommandBuilder } from "discord.js";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";

export default class QueueCommand extends Command {
    public readonly subcommands = ["add", "cancel", "list", "show"];
    public readonly name = "queue";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.String],
            requiredErrorMessage: `Please provide a subcommand! The valid commands are: \`${this.subcommands.join(
                "`, `"
            )}\`, \`remove\`, \`view\``,
            typeErrorMessage: "Please provide a valid subcommand!",
            name: "subcommand"
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.ManageMessages];
    public readonly description = "Manage the queued jobs";
    public readonly since = "5.57.0";
    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addSubcommand(subcommand =>
            subcommand
                .setName("add")
                .setDescription("Creates a new command queue")
                .addStringOption(option =>
                    option
                        .setName("run_after")
                        .setDescription("Specify after how much time the queued job will run")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("command")
                        .setDescription("Specify what command to run (include everything just without the prefix)")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("cancel")
                .setDescription("Cancels a previously added queue")
                .addIntegerOption(option => option.setName("id").setDescription("The queue ID").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("show")
                .setDescription("Shows information about a previously added queue")
                .addIntegerOption(option => option.setName("id").setDescription("The queue ID").setRequired(true))
        )
        .addSubcommand(subcommand => subcommand.setName("list").setDescription("List all queued jobs"));

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        const subcommand = context.isLegacy ? context.parsedNamedArgs.subcommand : context.options.getSubcommand(true);
        const command = this.client.commands.get(`queue__${subcommand}`);

        if (!command) {
            return;
        }

        if (context.isLegacy) context.args.shift();

        return await command.execute(message, context);
    }
}
