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
    RunCommandOptions,
    ValidationRule
} from "../../core/Command";

export type AFKsCommandScope = "guild" | "everywhere" | "global";

export default class AFKsCommand extends Command {
    public readonly name = "afks";
    public readonly subcommands = ["remove", "delete", "clear"];
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
    public readonly description = "Manage AFK statuses of other members.";
    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("Removes AFK status for a user")
                .addUserOption(option =>
                    option.setName("user").setDescription("The user").setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("scope")
                        .setDescription("Scope for this removal; defaults to Guild Scope")
                        .setChoices(
                            {
                                name: "Guild-Scoped",
                                value: "guild"
                            },
                            {
                                name: "Global",
                                value: "global"
                            },
                            {
                                name: "Everywhere",
                                value: "everywhere"
                            }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("clear")
                .setDescription("Removes AFK statuses for all users in a guild")
        );

    async execute(
        message: CommandMessage,
        context: BasicCommandContext,
        options: RunCommandOptions
    ): Promise<CommandReturn> {
        const subcommand = context.isLegacy
            ? context.parsedNamedArgs.subcommand
            : context.options.getSubcommand(true);
        const command = this.client.commands.get(`afks__${subcommand}`);

        if (!command) {
            await this.error(message, this.validationRules[0].errors!.required!);
            return;
        }

        if (context.isLegacy) context.args.shift();

        return await command.run({
            ...options,
            message,
            context
        });
    }
}
