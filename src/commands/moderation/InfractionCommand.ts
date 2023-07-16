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

import { PermissionsBitField } from "discord.js";
import Command, { AnyCommandContext, ArgumentType, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";

export default class InfractionCommand extends Command {
    public readonly name = "infraction";
    public readonly subcommands = ["view", "create", "edit", "delete"];
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.String],
            name: "subcommand",
            requiredErrorMessage: `Please provide a valid subcommand! The available subcommands are: \`${this.subcommands.join("`, `")}\`.`
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.ModerateMembers, PermissionsBitField.Flags.ViewAuditLog];
    public readonly permissionMode = "or";

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        const subcommand = context.isLegacy ? context.parsedNamedArgs.subcommand : context.options.getSubcommand(true);

        if ((subcommand === "edit" || subcommand === "create") && context.isLegacy) {
            await message.reply(`${this.emoji("error")} Please use the slash command \`/infraction ${subcommand}\` to perform this action.`);
            return;
        }

        if (context.isLegacy && !context.args[1]) {
            await message.reply(`${this.emoji("error")} Please provide an infraction ID to perform this action!`);
            return;
        }

        if (context.isLegacy && isNaN(parseInt(context.args[1]))) {
            await message.reply(`${this.emoji("error")} Please provide a __valid__ infraction ID to perform this action!`);
            return;
        }

        await this.deferIfInteraction(message);

        const command = this.client.commands.get(`infraction__${subcommand}`);

        if (command) {
            return await command.execute(message, {
                ...context,
                ...(context.isLegacy
                    ? {
                          parsedNamedArgs: {
                              id: parseInt(context.args[1])
                          }
                      }
                    : {})
            });
        }
    }
}
