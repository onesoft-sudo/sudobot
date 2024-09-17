/*
* This file is part of SudoBot.
*
* Copyright (C) 2021-2024 OSN Developers.
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

import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import Pagination from "@framework/pagination/Pagination";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import Queue from "@framework/queues/Queue";
import { shortUserInfo } from "@framework/utils/embeds";
import { Colors } from "@main/constants/Colors";
import QueueService from "@main/services/QueueService";
import { inlineCode, italic, time } from "discord.js";

class QueueListCommand extends Command {
    public override readonly name = "queue::list";
    public override readonly description: string = "List all queued jobs in this server.";
    public override readonly defer = true;
    public override readonly permissions = [PermissionFlags.ManageGuild];

    @Inject()
    private readonly queueService!: QueueService;

    public override async execute(context: Context): Promise<void> {
        const jobs = this.queueService.getJobs();

        if (jobs.size === 0) {
            return void (await context.error("There are currently no queued jobs in this server."));
        }

        const pagination: Pagination<Queue> = Pagination.withData(jobs.values())
            .setLimit(5)
            .setMaxTimeout(Pagination.DEFAULT_TIMEOUT)
            .setMessageOptionsBuilder(({ data, maxPages, page }) => {
                let description = "";

                for (const queue of data) {
                    description += `### Job #${queue.id}\n`;
                    description += `**Type:** ${inlineCode((queue.constructor as unknown as { uniqueName: string }).uniqueName)}\n`;
                    description += `**Created By:** ${queue.userId ? (queue.userId === "0" ? "[Unknown]" : shortUserInfo(this.application.client, queue.userId)) : italic("Unknown")}\n`;
                    description += `**Creation Time:** ${queue.createdAt ? time(queue.createdAt, "R") : "`[Not yet created]`"}\n`;
                    description += `**Execution:** ${time(queue.runsAt, "R")}\n\n`;
                }

                return {
                    embeds: [
                        {
                            author: {
                                name: `Queues in ${context.guild.name}`,
                                icon_url: context.guild.iconURL() ?? undefined
                            },
                            color: Colors.Primary,
                            description,
                            footer: {
                                text: `Page ${page} of ${maxPages} • ${jobs.size} queues total`
                            }
                        }
                    ]
                };
            });

        const reply = await context.reply(await pagination.getMessageOptions());
        pagination.setInitialMessage(reply);
    }
}

export default QueueListCommand;
