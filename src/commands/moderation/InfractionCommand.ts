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

import { InfractionType } from "@prisma/client";
import { PermissionsBitField, SlashCommandBuilder } from "discord.js";
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
    public readonly description = "Clear messages in bulk.";
    public readonly detailedDscription = "This command clears messages in bulk, by user or by count or both. This operation may take some time to complete.";
    public readonly argumentSyntaxes = [
        "<count>",
        "<UserID|UserMention> [count]",
    ];

    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addSubcommand(subcommand =>
            subcommand.setName('view').setDescription("View information about an infraction")
                .addIntegerOption(option => option.setName('id').setDescription("The infraction ID").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('edit').setDescription("Update reason of an infraction")
                .addIntegerOption(option => option.setName('id').setDescription("The infraction ID").setRequired(true))
                .addStringOption(option => option.setName('new_reason').setDescription("New reason to set"))
                .addStringOption(option => option.setName('new_duration').setDescription("New duration to set"))
                .addBooleanOption(option => option.setName('silent').setDescription("Specify if the bot should not let the user know about this, defaults to true"))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('delete').setDescription("Delete an infraction")
                .addIntegerOption(option => option.setName('id').setDescription("The infraction ID").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('clear').setDescription("Clear infractions for a user")
                .addUserOption(option => option.setName('user').setDescription("The target user").setRequired(true))
                .addStringOption(option => option.setName('type').setDescription("Specify infraction type").setChoices(
                    ...['Ban', "Mute", "Hardmute", "Kick", "Warning", "Softban", "Tempban", "Unmute", "Unban", "Timeout", "Timeout Remove", "Bean", "Shot"]
                        .map(option => ({ name: option, value: option.toLowerCase().replace(' ', '_') }))
                ))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('create').setDescription("Add infractions to a user")
                .addUserOption(option => option.setName('user').setDescription("The target user").setRequired(true))
                .addStringOption(option => option.setName('type').setDescription("Specify infraction type").setChoices(...[
                    {
                        name: "Ban",
                        value: InfractionType.BAN
                    },
                    {
                        name: "Kick",
                        value: InfractionType.KICK
                    },
                    {
                        name: "Mute",
                        value: InfractionType.MUTE
                    },
                    {
                        name: "Warning",
                        value: InfractionType.WARNING
                    },
                    {
                        name: "Unmute",
                        value: InfractionType.UNMUTE
                    },
                    {
                        name: "Unban",
                        value: InfractionType.UNBAN
                    },
                    {
                        name: "Bulk message delete",
                        value: InfractionType.BULK_DELETE_MESSAGE
                    },
                    {
                        name: "Temporary Ban",
                        value: InfractionType.TEMPBAN
                    },
                    {
                        name: "Timeout",
                        value: InfractionType.TIMEOUT
                    },
                    {
                        name: "Timeout remove",
                        value: InfractionType.TIMEOUT_REMOVE
                    }
                ].map(o => ({ ...o, value: o.value.toLowerCase() }))).setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription("The reason for giving this infraction"))
                .addStringOption(option => option.setName('duration').setDescription("The duration of this infraction (e.g. 45, 1h30m)"))
        );

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
