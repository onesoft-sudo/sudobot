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

import { PermissionsBitField, SlashCommandBuilder, escapeCodeBlock, escapeInlineCode } from "discord.js";
import Command, { AnyCommandContext, ArgumentType, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";

export default class SnippetCommand extends Command {
    public readonly subcommands = ["list", "create", "delete", "rename"];
    public readonly name = "snippet";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.String],
            name: "subcommand",
            requiredErrorMessage: `Please provide a valid subcommand! The available subcommands are: \`${this.subcommands.join("`, `")}\`.`
        },
        {
            types: [ArgumentType.String],
            name: "name",
            optional: true
        },
        {
            types: [ArgumentType.StringRest],
            name: "content",
            optional: true
        }
    ];
    public readonly permissions = [
        PermissionsBitField.Flags.BanMembers,
        PermissionsBitField.Flags.KickMembers,
        PermissionsBitField.Flags.ManageGuild,
        PermissionsBitField.Flags.ModerateMembers,
        PermissionsBitField.Flags.ManageMessages
    ];
    public readonly permissionMode = "or";
    public readonly aliases = ["tag", "tags", "snippets"];
    public readonly description = "Manage snippets/tags.";

    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addSubcommand(subcommand =>
            subcommand
                .setName("create")
                .setDescription("Create a snippet")
                .addStringOption(option => option.setName("name").setDescription("The snippet name").setRequired(true))
                .addStringOption(option => option.setName("content").setDescription("The snippet content").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("delete")
                .setDescription("Delete a snippet")
                .addStringOption(option => option.setName("name").setDescription("The snippet name").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("rename")
                .setDescription("Rename a snippet")
                .addStringOption(option => option.setName("old_name").setDescription("The old snippet name").setRequired(true))
                .addStringOption(option => option.setName("new_name").setDescription("New snippet name to set").setRequired(true))
        )
        .addSubcommand(subcommand => subcommand.setName("list").setDescription("List all snippets in the server"));

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        const subcommand: string = context.isLegacy ? context.parsedNamedArgs.subcommand : context.options.getSubcommand(true);

        if (!this.subcommands.includes(subcommand.toLowerCase())) {
            return {
                __reply: true,
                content: `\`${escapeInlineCode(
                    escapeCodeBlock(subcommand)
                )}\` is not a valid subcommand! The available subcommands are: \`${this.subcommands.join("`, `")}\``
            };
        }

        if (context.isLegacy && subcommand.toLowerCase() !== "list") {
            /* Ensure that `parsedNamedArgs.name` is populated */
            if (context.args[1] === undefined) {
                await this.error(message, "Please provide a snippet/tag name to perform this action!");
                return;
            }
        }

        await this.deferIfInteraction(message);

        const command = await this.client.commands.get(`snippet__${subcommand}`);

        if (command) {
            return await command.execute(message, {
                ...context,
                ...(context.isLegacy
                    ? {
                          parsedNamedArgs: {
                              ...context.parsedNamedArgs,
                              name: context.parsedNamedArgs.name,
                              content: context.parsedNamedArgs.content,
                              new_name: subcommand === "rename" ? context.parsedNamedArgs.content.split(/ +/)[0] : undefined
                          }
                      }
                    : {})
            });
        }
    }
}
