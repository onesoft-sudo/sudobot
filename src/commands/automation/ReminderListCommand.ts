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

import { EmbedBuilder, User, time } from "discord.js";
import Command, { AnyCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import Pagination from "../../utils/Pagination";

export default class ReminderListCommand extends Command {
    public readonly name = "reminder__list";
    public readonly validationRules: ValidationRule[] = [];
    public readonly aliases = ["rlist"];

    public readonly description = "Lists the queued reminders for the user who runs this command.";

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        await this.deferIfInteraction(message);

        const queues = this.client.queueManager.queues
            .filter(queue => queue.options.name === "ReminderQueue" && queue.options.userId === message.member!.user!.id)
            .toJSON();

        const paginator = new Pagination(queues, {
            channelId: message.channelId!,
            client: this.client,
            guildId: message.guildId!,
            limit: 10,
            userId: message.member?.user.id,
            timeout: 180_000,
            embedBuilder({ data, currentPage, maxPages }) {
                let description = "";

                for (const queue of data) {
                    const content = queue.options.args[1];
                    description += `**#${queue.id}**: ${content == "" ? "*No message*" : content} (${time(
                        queue.options.willRunAt,
                        "R"
                    )})\n`;
                }

                description = description == "" ? "*No reminder found.*" : description;

                return new EmbedBuilder({
                    title: "Reminders",
                    author: {
                        name: message.member!.user.username,
                        icon_url: (message.member!.user as User)?.displayAvatarURL?.() ?? undefined
                    },
                    description,
                    color: 0x007bff,
                    footer: {
                        text: `Page ${currentPage} of ${maxPages} • ${queues.length} reminders total`
                    },
                    timestamp: new Date().toISOString()
                });
            }
        });

        const reply = await this.deferredReply(message, await paginator.getMessageOptions());
        await paginator.start(reply!);
    }
}
