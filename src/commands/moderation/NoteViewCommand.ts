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
import { EmbedBuilder, PermissionsBitField } from "discord.js";
import Command, { BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";

export default class NoteViewCommand extends Command {
    public readonly name = "note__view";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [PermissionsBitField.Flags.ModerateMembers, PermissionsBitField.Flags.ViewAuditLog];
    public readonly permissionMode = "or";
    public readonly description = "Show a note";
    public readonly argumentSyntaxes = ["<id>"];

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
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

        const note = await this.client.prisma.infraction.findFirst({
            where: {
                id,
                guildId: message.guildId!,
                type: InfractionType.NOTE
            }
        });

        if (!note) {
            await this.error(message, "No such note found with that ID!");
            return;
        }

        const user = await this.client.fetchUserSafe(note.userId);

        await this.deferredReply(message, {
            embeds: [
                new EmbedBuilder({
                    author: {
                        name: user?.username ?? "*Unknown*",
                        iconURL: user?.displayAvatarURL()
                    },
                    color: 0x007bff,
                    description: note.reason ?? "*No content*",
                    fields: [
                        {
                            name: "Created by",
                            value: `<@${note.moderatorId}> (${note.moderatorId})`,
                            inline: true
                        },
                        {
                            name: "User",
                            value: `<@${note.userId}> (${note.userId})`,
                            inline: true
                        },
                        {
                            name: "ID",
                            value: `${id}`
                        }
                    ]
                }).setTimestamp()
            ]
        });
    }
}
