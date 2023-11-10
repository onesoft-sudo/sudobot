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
import Command, { BasicCommandContext, CommandMessage, CommandReturn } from "../../core/Command";

export default class ReminderCommand extends Command {
    public readonly name = "reminder";
    public readonly permissions = [];
    public readonly subcommands = ["list"];
    public readonly description = "Manage your reminders.";

    public readonly slashCommandBuilder = new SlashCommandBuilder().addSubcommand(subcommand =>
        subcommand.setName("list").setDescription("Lists your upcoming reminders")
    );

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        if (context.isLegacy && (context.args[0] === undefined || !this.subcommands.includes(context.args[0]))) {
            await this.error(
                message,
                `Please specify a valid subcommand! The valid subcommands are \`${this.subcommands.join("`, `")}\``
            );
            return;
        }

        const subcommand: string = context.isLegacy ? context.args[0] : context.options.getSubcommand(true);
        const command = this.client.commands.get(`reminder__${subcommand}`);

        if (command) {
            return command.execute(message, context);
        }
    }
}
