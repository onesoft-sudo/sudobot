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

import { Message, PermissionsBitField } from "discord.js";
import Command, { ArgumentType, CommandReturn, ValidationRule } from "../../core/Command";
import { LegacyCommandContext } from "../../services/CommandManager";

export default class SnippetRandomizeCommand extends Command {
    public readonly name = "snippet__randomize";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.String],
            requiredErrorMessage: "Please specify the name of the snippet/tag to toggle randomization!",
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
    public readonly permissionMode = "or";
    public readonly aliases: string[] = ["randsnippet", "randtag", "dyntag", "dynamictag", "dynsnippet"];
    public readonly beta: boolean = true;
    public readonly supportsInteractions = false;

    async execute(message: Message, context: LegacyCommandContext): Promise<CommandReturn> {
        const name: string = context.parsedNamedArgs.name;

        if (!this.client.snippetManager.checkPermissionInSnippetCommands(name, message, this)) {
            return;
        }

        const { error, randomization } = await this.client.snippetManager.toggleRandomization({
            name,
            guildId: message.guildId!
        });

        if (error) {
            await this.error(message, error);
            return;
        }

        await this.deferredReply(
            message,
            `${this.emoji("check")} Successfully ${randomization ? "enabled" : "disabled"} randomization on the snippet/tag.`
        );
    }
}
