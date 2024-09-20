/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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

import type { Buildable } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import type InteractionContext from "@framework/commands/InteractionContext";
import type LegacyContext from "@framework/commands/LegacyContext";
import Pagination from "@framework/widgets/Pagination";
import { Colors } from "@main/constants/Colors";
import type ReminderQueue from "@main/queues/ReminderQueue";
import type { ChatInputCommandInteraction } from "discord.js";
import { time } from "discord.js";

class ReminderCommand extends Command {
    public override readonly name = "reminder";
    public override readonly description: string = "Manage your reminders.";
    public override readonly detailedDescription: string =
        "Manage your reminders by listing, or deleting them.";
    public override readonly defer = true;
    public override readonly usage = ["<subcommand: String> <...args: Any[]>"];
    public override readonly subcommands = ["list", "remove", "clear"];
    public override readonly aliases = ["reminders"];
    public override readonly subcommandMeta = {
        list: {
            description: "List all your reminders."
        },
        remove: {
            description: "Remove a reminder by its ID.",
            usage: ["<id: Integer>"]
        },
        clear: {
            description: "Clear all your reminders."
        }
    };

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addSubcommand(subcommand =>
                    subcommand.setName("list").setDescription("List all your reminders.")
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("remove")
                        .setDescription("Remove a reminder by its ID.")
                        .addIntegerOption(option =>
                            option
                                .setName("id")
                                .setDescription("The ID of the reminder to remove.")
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand.setName("clear").setDescription("Clear all your reminders.")
                )
        ];
    }

    public override async execute(
        context: LegacyContext | InteractionContext<ChatInputCommandInteraction>
    ): Promise<void> {
        const subcommand = context.isChatInput()
            ? context.options.getSubcommand(true)
            : context.args[0];

        switch (subcommand) {
            case "list":
                await this.listReminders(context);
                break;
            case "remove":
                await this.removeReminder(context);
                break;
            case "clear":
                await this.clearReminders(context);
                break;
            default:
                return void (await context.error(
                    "Invalid subcommand provided. Valid subcommands are: " +
                        this.subcommands.join(", ")
                ));
        }
    }

    private async listReminders(context: Context): Promise<void> {
        const queues = this.application.service("queueService").getJobs();
        const reminders = [];

        for (const queue of queues.values()) {
            if (
                queue.uniqueName === "reminder" &&
                (queue as ReminderQueue).data.userId === context.user.id
            ) {
                reminders.push(queue);
            }
        }

        if (!reminders.length) {
            await context.error("You have no reminders set.");
            return;
        }

        const pagination = Pagination.withData(reminders as ReminderQueue[])
            .setLimit(5)
            .setMaxTimeout(Pagination.DEFAULT_TIMEOUT)
            .setMessageOptionsBuilder(({ data, maxPages, page }) => {
                let description = "";

                for (const reminder of data) {
                    description += `### Reminder #${reminder.id}\n`;
                    description += `**Message:** ${reminder.data.message}\n`;
                    description += `**Creation Time:** ${reminder.createdAt ? time(reminder.createdAt, "R") : "`[Not yet created]`"}\n`;
                    description += `**Execution:** ${time(reminder.runsAt, "R")}\n\n`;
                }

                return {
                    embeds: [
                        {
                            title: "Your upcoming reminders",
                            color: Colors.Primary,
                            description,
                            footer: {
                                text: `Page ${page} of ${maxPages} • ${reminders.length} reminders total`
                            }
                        }
                    ]
                };
            });

        const reply = await context.reply(await pagination.getMessageOptions());
        pagination.setInitialMessage(reply);
    }

    private async removeReminder(
        context: LegacyContext | InteractionContext<ChatInputCommandInteraction>
    ): Promise<void> {
        const id = context.isLegacy() ? context.argv[2] : context.options.getInteger("id");

        if (!id) {
            await context.error("You must specify the ID of the reminder to remove.");
            return;
        }

        const integerId = typeof id === "string" ? parseInt(id) : id;

        if (isNaN(integerId)) {
            await context.error("The ID must be a number.");
            return;
        }

        const queue = this.application.service("queueService").getJob(integerId);

        if (!queue || (queue as ReminderQueue).data.userId !== context.user.id) {
            await context.error("No such reminder with that ID was found.");
            return;
        }

        await queue.cancel();
        await context.success(`Reminder #${queue.id} has been removed.`);
    }

    private async clearReminders(context: Context): Promise<void> {
        const queues = this.application.service("queueService").getJobs();
        const reminders = [];

        for (const queue of queues.values()) {
            if (
                queue.uniqueName === "reminder" &&
                (queue as ReminderQueue).data.userId === context.user.id
            ) {
                reminders.push(queue);
            }
        }

        if (!reminders.length) {
            await context.error("You have no reminders to clear.");
            return;
        }

        for (const reminder of reminders) {
            await reminder.cancel();
        }

        await context.success("All your reminders have been cleared.");
    }
}

export default ReminderCommand;
