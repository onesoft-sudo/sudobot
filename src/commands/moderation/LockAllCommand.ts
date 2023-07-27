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

import { PermissionsBitField, User } from "discord.js";
import Command, { AnyCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";

export default class LockAllCommand extends Command {
    public readonly name = "lock__lockall";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [PermissionsBitField.Flags.ManageChannels];
    public readonly aliases = ["lockall", "lockserver"];

    public readonly description = "Locks all the channels.";
    public readonly detailedDscription = "This command locks down the entire server. Private channels will be skipped.";
    public readonly argumentSyntaxes = [];

    public readonly botRequiredPermissions = [PermissionsBitField.Flags.ManageChannels];

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        await this.deferIfInteraction(message);

        await this.client.channelLockManager.lockGuild(message.guild!, {
            ignorePrivateChannels: true,
            moderator: message.member!.user as User
        });

        await this.deferredReply(message, `${this.emoji("check")} The server has been locked.`);
    }
}
