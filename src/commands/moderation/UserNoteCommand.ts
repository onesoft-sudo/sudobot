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

export default class UserNoteCommand extends Command {
    public readonly name = "unote";
    public readonly subcommands = ["view", "create", "edit", "delete", "list", "clear", "remove"];
    public readonly subCommandCheck = true;
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.String],
            name: "subcommand",
            errors: {
                required: `Please provide a valid subcommand! The available subcommands are: \`${this.subcommands.join(
                    "`, `"
                )}\`.`
            }
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.ModerateMembers, PermissionsBitField.Flags.ViewAuditLog];
    public readonly permissionMode = "or";
    public readonly description = "Manage notes.";
    public readonly detailedDescription = "Use this command to manage notes about users.";
    public readonly argumentSyntaxes = ["<subcommand> [...args]"];
    public readonly aliases = ["usernote", "unotes", "usernotes"];

    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .setName("usernote")
        .addSubcommand(subcommand =>
            subcommand
                .setName("view")
                .setDescription("View a note")
                .addIntegerOption(option => option.setName("id").setDescription("The note ID").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("edit")
                .setDescription("Update a note")
                .addIntegerOption(option => option.setName("id").setDescription("The note ID").setRequired(true))
                .addStringOption(option => option.setName("content").setDescription("New content"))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("delete")
                .setDescription("Delete a note")
                .addIntegerOption(option => option.setName("id").setDescription("The note ID").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("clear")
                .setDescription("Clear notes for a user")
                .addUserOption(option => option.setName("user").setDescription("The target user").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("list")
                .setDescription("List notes for a user")
                .addUserOption(option => option.setName("user").setDescription("The target user").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("create")
                .setDescription("Add a note to a user")
                .addUserOption(option => option.setName("user").setDescription("The target user").setRequired(true))
                .addStringOption(option => option.setName("content").setDescription("The content of this note"))
        );

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        const subcommand = context.isLegacy ? context.parsedNamedArgs.subcommand : context.options.getSubcommand(true);

        await this.deferIfInteraction(message);

        const command = this.client.commands.get(`unote__${subcommand}`);

        if (context.isLegacy) context.args.shift();

        if (command) {
            return await command.execute(message, context);
        }
    }
}
