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
import { EmbedBuilder, PermissionsBitField, User, escapeCodeBlock } from "discord.js";
import Command, { AnyCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import Pagination from "../../utils/Pagination";
import { isSnowflake } from "../../utils/utils";

export default class NoteListCommand extends Command {
    public readonly name = "note__list";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [PermissionsBitField.Flags.ModerateMembers, PermissionsBitField.Flags.ViewAuditLog];
    public readonly permissionMode = "or";
    public readonly description = "List notes of a user";
    public readonly argumentSyntaxes = ["<UserID|UserMention>"];

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        if (context.isLegacy && context.args[0] === undefined) {
            await this.error(message, "Please specify a user to list notes!");
            return;
        }

        await this.deferIfInteraction(message);

        let user: User | null | undefined = context.isLegacy ? undefined : context.options.getUser("user", true);

        if (context.isLegacy) {
            user = await this.client.fetchUserSafe(
                isSnowflake(context.args[0])
                    ? context.args[0]
                    : context.args[0].substring(context.args[0].includes("!") ? 3 : 2, context.args[0].length - 1)
            );
        }

        if (!user) {
            await this.error(message, "Invalid user specified!");
            return;
        }

        const notes = await this.client.prisma.infraction.findMany({
            where: {
                userId: user.id,
                guildId: message.guildId!,
                type: InfractionType.NOTE
            }
        });

        if (notes.length === 0) {
            await this.deferredReply(message, "No notes were found for this user.");
            return;
        }

        const pagination = new Pagination(notes, {
            channelId: message.channelId!,
            client: this.client,
            guildId: message.guildId!,
            limit: 10,
            timeout: 180_000,
            userId: message.member!.user.id,
            embedBuilder({ currentPage, data, maxPages }) {
                let description = "";

                for (const note of data) {
                    description += `ID: ${note.id}\nCreated by: <@${note.moderatorId}> (${note.moderatorId})\n`;
                    description += `\`\`\`\n${escapeCodeBlock(note.reason ?? "*No content*")}\n\`\`\`\n`;
                    description += "\n";
                }

                return new EmbedBuilder({
                    author: {
                        name: user!.username,
                        icon_url: user!.displayAvatarURL()
                    },
                    color: 0x007bff,
                    description,
                    footer: {
                        text: `Page ${currentPage} of ${maxPages}`
                    }
                });
            }
        });

        const reply = await this.deferredReply(message, await pagination.getMessageOptions(1));
        await pagination.start(reply);
    }
}
