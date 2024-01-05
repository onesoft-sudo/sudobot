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

import { formatDistanceToNow } from "date-fns";
import { ChatInputCommandInteraction, Colors, EmbedBuilder, Message } from "discord.js";
import os from "os";
import Command, { BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";

const emoji = (ms: number) => {
    let emoji = "🟢";

    if (ms >= 500) {
        emoji = "🔴";
    } else if (ms >= 350) {
        emoji = "🟡";
    }

    return emoji;
};

const formatSize = (size: number) => Math.round((size / 1024 / 1024) * 100) / 100 + "MB";

export default class SystemCommand extends Command {
    public readonly name = "system";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [];
    public readonly description = "Shows the bot system status.";

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        let reply = <Message>await message
            .reply({
                embeds: [
                    {
                        color: Colors.Gold,
                        description: "Loading..."
                    }
                ]
            })
            .catch(console.error);

        if (message instanceof ChatInputCommandInteraction) {
            reply = await message.fetchReply();
        }

        const systemLatency = reply.createdTimestamp - message.createdTimestamp;
        const memoryUsage = process.memoryUsage();
        const systemLatencyEmoji = emoji(systemLatency);

        await reply.edit({
            embeds: [
                new EmbedBuilder({
                    author: {
                        iconURL: this.client.user!.displayAvatarURL(),
                        name: "System Status"
                    },
                    color: 0x007bff,
                    description:
                        systemLatencyEmoji === "🔴" ? `${this.emoji("error")} Elevated latency/downtime` : `${this.emoji("check")} Operational`,
                    fields: [
                        {
                            name: "System Latency",
                            value: (systemLatencyEmoji + " " + systemLatency + "ms").trimStart()
                        },
                        {
                            name: "API Latency",
                            value: (emoji(this.client.ws.ping) + " " + this.client.ws.ping + "ms").trimStart()
                        },
                        {
                            name: "Memory Usage",
                            value: `${formatSize(memoryUsage.rss)} (${formatSize(memoryUsage.heapUsed)} used by the bot)`
                        },
                        {
                            name: "Uptime",
                            value: `${formatDistanceToNow(Date.now() - (global as unknown as { bootDate: number }).bootDate)}`
                        }
                    ]
                }).setTimestamp()
            ]
        });
    }
}
