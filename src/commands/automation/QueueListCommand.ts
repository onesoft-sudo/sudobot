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

import { formatDistanceStrict } from "date-fns";
import { EmbedBuilder, PermissionsBitField } from "discord.js";
import Command, { BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import Pagination from "../../utils/Pagination";

export default class QueueListCommand extends Command {
    public readonly name = "queue__list";
    public readonly validationRules: ValidationRule[] = [];
    public readonly aliases = ["queues", "queuelist", "listqueue", "listqueues"];
    public readonly permissions = [PermissionsBitField.Flags.ManageMessages];
    public readonly description = "Lists all the queued jobs";
    public readonly since = "5.57.0";

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        const queues = this.client.queueManager.queues.filter(queue => queue.options.guild.id === message.guildId!);

        const pagination = new Pagination(queues.toJSON(), {
            channelId: message.channelId!,
            guildId: message.guildId!,
            limit: 10,
            userId: message.member!.user.id,
            client: this.client,
            timeout: 180_000,
            embedBuilder({ data, currentPage, maxPages }) {
                let description = "";

                for (const queue of data) {
                    description += `**ID**: \`${queue.id}\`\n`;
                    description += `Type: \`${queue.options.name}\`\n`;
                    description += `Runs in: ${formatDistanceStrict(new Date(), queue.options.willRunAt)}\n\n`;
                }

                description = description === "" ? "No queued jobs." : description;

                return new EmbedBuilder({
                    title: "Queue job list",
                    color: 0x007bff,
                    description,
                    footer: {
                        text: `Page ${currentPage} of ${maxPages}`
                    }
                });
            }
        });

        const reply = await message.reply({
            ...(await pagination.getMessageOptions(1)),
            fetchReply: true
        });

        await pagination.start(reply);
    }
}
