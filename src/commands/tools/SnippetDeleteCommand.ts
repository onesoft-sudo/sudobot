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

export default class SnippetDeleteCommand extends Command {
    public readonly name = "snippet__delete";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.String],
            requiredErrorMessage: "Please specify the name of the snippet/tag to remove!",
            typeErrorMessage: "Please specify a valid snippet/tag name!",
            name: "name"
        }
    ];
    public readonly permissions = [
        PermissionsBitField.Flags.BanMembers,
        PermissionsBitField.Flags.KickMembers,
        PermissionsBitField.Flags.ManageGuild,
        PermissionsBitField.Flags.ModerateMembers,
        PermissionsBitField.Flags.ManageMessages
    ];
    public readonly aliases: string[] = ["removetag", "rmtag", "deltag", "delsnippet", "rmsnippet"];
    public readonly permissionMode = "or";

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        const name: string = context.isLegacy ? context.parsedNamedArgs.name : context.options.getString("name", true);

        if (!this.client.snippetManager.checkPermissionInSnippetCommands(name, message, this)) {
            return;
        }

        const { error } = await this.client.snippetManager.deleteSnippet({
            name,
            guildId: message.guildId!
        });

        if (error) {
            await this.error(message, error);
            return;
        }

        await this.deferredReply(message, `${this.emoji("check")} Successfully deleted the snippet/tag.`);
    }
}
