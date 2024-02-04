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
import { formatDistanceToNowStrict } from "date-fns";
import { EmbedBuilder, PermissionsBitField, User } from "discord.js";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import Pagination from "../../utils/Pagination";

export default class InfractionListCommand extends Command {
    public readonly name = "infraction__list";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.User],
            name: "user",
            errors: {
                required: `Please provide a user to view their infractions!`,
                "type:invalid": `Please provide a __valid__ user!`,
                "entity:null": "This user does not exist!"
            },
            entity: true
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.ModerateMembers, PermissionsBitField.Flags.ViewAuditLog];
    public readonly permissionMode = "or";
    public readonly aliases: string[] = ["l", "history"];

    public readonly description = "View infractions of a user.";
    public readonly argumentSyntaxes = ["<UserID|UserMention>"];

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        const user: User = context.isLegacy ? context.parsedNamedArgs.user : context.options.getUser("user", true);

        const infractions = await this.client.prisma.infraction.findMany({
            where: { userId: user.id, guildId: message.guildId! }
        });

        if (infractions.length === 0) {
            await this.deferredReply(message, "No infractions found for this user!");
            return;
        }

        const pagination = new Pagination(infractions, {
            channelId: message.channelId!,
            guildId: message.guildId!,
            limit: 4,
            userId: message.member!.user.id,
            client: this.client,
            timeout: 180_000,
            embedBuilder({ data, currentPage, maxPages }) {
                let description = "";

                for (const infraction of data) {
                    description += `**ID**: \`${infraction.id}\`\n`;
                    description += `**Type**: ${
                        infraction.type === InfractionType.BULK_DELETE_MESSAGE
                            ? "Bulk message delete"
                            : infraction.type[0] + infraction.type.substring(1).toLowerCase().replace(/_/g, " ")
                    }\n`;
                    description += `Responsible Moderator: <@${infraction.moderatorId}>\n`;
                    description += `Reason:\n${
                        infraction.reason ? `\`\`\`\n${infraction.reason}\n\`\`\`` : "*No reason provided*"
                    }\n`;
                    description += `Created at: ${infraction.createdAt.toLocaleString()} (${formatDistanceToNowStrict(
                        infraction.createdAt,
                        {
                            addSuffix: true
                        }
                    )})\n`;
                    description += `Updated at: ${infraction.updatedAt.toLocaleString()} (${formatDistanceToNowStrict(
                        infraction.updatedAt,
                        {
                            addSuffix: true
                        }
                    )})\n`;
                    description += `\n`;
                }

                return new EmbedBuilder({
                    author: {
                        name: user.username,
                        icon_url: user.displayAvatarURL()
                    },
                    description,
                    footer: {
                        text: `Page ${currentPage} of ${maxPages} • ${infractions.length} infractions total`
                    },
                    color: 0x007bff
                }).setTimestamp();
            }
        });

        const reply = await this.deferredReply(message, await pagination.getMessageOptions(1));
        await pagination.start(reply);
    }
}
