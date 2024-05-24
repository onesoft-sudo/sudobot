import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import Pagination from "@framework/pagination/Pagination";
import Queue from "@framework/queues/Queue";
import { shortUserInfo } from "@framework/utils/embeds";
import { Colors } from "@main/constants/Colors";
import QueueService from "@main/services/QueueService";
import { PermissionFlagsBits, inlineCode, italic, time } from "discord.js";

class QueueListCommand extends Command {
    public override readonly name = "queue::list";
    public override readonly description: string = "List all queued jobs in this server.";
    public override readonly defer = true;
    public override readonly permissions = [PermissionFlagsBits.ManageGuild];

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
