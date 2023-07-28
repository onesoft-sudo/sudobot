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
import { PermissionsBitField } from "discord.js";
import Command, { AnyCommandContext, CommandMessage, CommandReturn } from "../../core/Command";

export default class NoteDeleteCommand extends Command {
    public readonly name = "note__delete";
    public readonly permissions = [PermissionsBitField.Flags.ModerateMembers, PermissionsBitField.Flags.ViewAuditLog];
    public readonly permissionMode = "or";
    public readonly description = "Delete a note";
    public readonly argumentSyntaxes = ["<id>"];

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        if (context.isLegacy && context.args[0] === undefined) {
            await this.error(message, "Please specify the ID of the note to delete!");
            return;
        }

        let id = context.isLegacy ? undefined : context.options.getInteger("id", true);

        if (context.isLegacy) {
            id = parseInt(context.args[0]);

            if (isNaN(id)) {
                await this.error(message, "Invalid note ID given - note IDs must be valid numbers!");
                return;
            }
        }

        await this.deferIfInteraction(message);

        const { count } = await this.client.prisma.infraction.deleteMany({
            where: {
                id,
                guildId: message.guildId!,
                type: InfractionType.NOTE
            }
        });

        if (count === 0) {
            await this.error(message, "No such note found with that ID!");
            return;
        }

        await this.deferredReply(message, `${this.emoji("check")} Successfully deleted the note.`);
    }
}
