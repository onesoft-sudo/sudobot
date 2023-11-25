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

import { PermissionsBitField, escapeCodeBlock, escapeInlineCode } from "discord.js";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";

export default class SnippetRenameCommand extends Command {
    public readonly name = "snippet__rename";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.String],
            requiredErrorMessage: "Please specify the name of the snippet/tag to rename!",
            typeErrorMessage: "Please specify a valid snippet/tag name!",
            name: "name"
        },
        {
            types: [ArgumentType.String],
            requiredErrorMessage: "Please specify a new name to set!",
            typeErrorMessage: "Please specify a valid snippet/tag name!",
            name: "new_name"
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
    public readonly aliases: string[] = ["renametag", "mvtag", "renamesnippet", "mvsnippet"];

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        const name: string = context.isLegacy ? context.parsedNamedArgs.name : context.options.getString("old_name", true);

        if (!await this.client.snippetManager.checkPermissionInSnippetCommands(name, message, this)) {
            return;
        }

        const newName: string = context.isLegacy ? context.parsedNamedArgs.new_name : context.options.getString("new_name", true);

        if (/\s/.test(name)) {
            await this.error(message, "Snippet name cannot contain spaces!");
            return;
        }

        if (/\s/.test(newName)) {
            await this.error(message, "The new name for the snippet cannot contain spaces!");
            return;
        }

        const { error } = await this.client.snippetManager.renameSnippet({
            name,
            newName,
            guildId: message.guildId!
        });

        if (error) {
            await this.error(message, error);
            return;
        }

        await this.deferredReply(
            message,
            `${this.emoji("success")} Successfully renamed the snippet/tag to \`${escapeInlineCode(escapeCodeBlock(newName))}\`.`
        );
    }
}
