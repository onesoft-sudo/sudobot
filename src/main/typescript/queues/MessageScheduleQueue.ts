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

import Queue from "@framework/queues/Queue";
import { fetchChannel, fetchUser } from "@framework/utils/entities";
import MessageDeleteQueue from "@main/queues/MessageDeleteQueue";
import type { APIEmbed, Snowflake } from "discord.js";

type MessageScheduleQueuePayload = {
    guildId: Snowflake;
    channelId: Snowflake;
    deleteAfter?: number;
    content: string;
    mentionEveryone: boolean;
};

class MessageScheduleQueue extends Queue<MessageScheduleQueuePayload> {
    public static override readonly uniqueName = "message_schedule";

    public async execute({
        guildId,
        channelId,
        content,
        deleteAfter,
        mentionEveryone
    }: MessageScheduleQueuePayload) {
        const guild = this.application.client.guilds.cache.get(guildId);

        if (!guild) {
            return;
        }

        const channel = await fetchChannel(guild, channelId);

        if (!channel?.isTextBased()) {
            return;
        }

        try {
            const { data, output } = await this.application
                .service("directiveParsingService")
                .parse(content);
            const options = {
                content: output.trim() === "" ? undefined : output,
                embeds: (data.embeds as APIEmbed[]) ?? [],
                allowedMentions: mentionEveryone ? undefined : { parse: [], roles: [], users: [] }
            };

            try {
                const { id } = await channel.send(options);

                if (deleteAfter) {
                    this.application
                        .service("queueService")
                        .create(MessageDeleteQueue, {
                            data: {
                                guildId,
                                channelId: channel.id,
                                messageId: id
                            },
                            guildId,
                            runsAt: new Date(Date.now() + deleteAfter)
                        })
                        .schedule()
                        .catch(this.application.logger.error);
                }
            } catch (error) {
                this.application.logger.error(error);
                return;
            }

            const user = await fetchUser(this.application.client, this.userId);

            if (user) {
                this.application
                    .service("systemAuditLogging")
                    .logEchoCommandExecuted({
                        command: "schedule",
                        guild,
                        rawCommandContent: content,
                        generatedMessageOptions: options,
                        user
                    })
                    .catch(this.application.logger.error);
            }
        } catch (error) {
            this.application.logger.error(error);
        }
    }
}

export default MessageScheduleQueue;
