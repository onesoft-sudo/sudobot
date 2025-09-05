/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025 OSN Developers.
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

import { Override } from "@framework/decorators/Override";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { HasEventListeners } from "@framework/types/HasEventListeners";
import {
    earlyMessageInspectionEntries,
    EarlyMessageInspectionEntryCreatePayload
} from "@main/models/EarlyMessageInspectionEntry";
import { getAxiosClient } from "@main/utils/axios";
import { type Awaitable, Collection, GuildMember, Message, type PartialMessage, type Snowflake } from "discord.js";
import { and, eq, inArray, sql } from "drizzle-orm";

@Name("earlyMessageInspectionService")
class EarlyMessageInspectionService extends Service implements HasEventListeners {
    private readonly updateQueue = new Collection<`${Snowflake}::${Snowflake}`, number>();
    private readonly deleteQueue: Array<`${Snowflake}::${Snowflake}`> = [];

    public override boot() {
        setInterval(() => {
            if (this.updateQueue.size) {
                const values: EarlyMessageInspectionEntryCreatePayload[] = [];

                for (const [key, value] of this.updateQueue) {
                    if (value === Number.NEGATIVE_INFINITY) {
                        this.updateQueue.delete(key);
                        continue;
                    }

                    const [guildId, userId] = key.split("::");

                    values.push({
                        guildId,
                        userId,
                        messageCount: value
                    });

                    this.updateQueue.delete(key);
                }

                if (values.length) {
                    this.application.database.drizzle
                        .insert(earlyMessageInspectionEntries)
                        .values(values)
                        .onConflictDoUpdate({
                            target: [earlyMessageInspectionEntries.guildId, earlyMessageInspectionEntries.userId],
                            set: {
                                messageCount: sql.raw(`excluded.${earlyMessageInspectionEntries.messageCount.name}`)
                            }
                        });
                }
            }

            if (this.deleteQueue.length) {
                const deleteQueue = this.deleteQueue;
                this.deleteQueue.length = 0;

                const guildIds = [];
                const userIds = [];

                for (const key of deleteQueue) {
                    const [guildId, userId] = key.split("::");

                    guildIds.push(guildId);
                    userIds.push(userId);
                }

                if (userIds.length && guildIds.length) {
                    this.application.database.drizzle
                        .delete(earlyMessageInspectionEntries)
                        .where(
                            and(
                                inArray(earlyMessageInspectionEntries.guildId, guildIds),
                                inArray(earlyMessageInspectionEntries.userId, userIds)
                            )
                        );
                }
            }
        }, 120_000);
    }

    private async getMessageCount(guildId: Snowflake, userId: Snowflake) {
        const existingEntry = this.updateQueue.get(`${guildId}::${userId}`);

        if (existingEntry !== undefined) {
            return existingEntry === Number.NEGATIVE_INFINITY ? null : existingEntry;
        }

        const entry = await this.application.database.query.earlyMessageInspectionEntries.findFirst({
            where: and(
                eq(earlyMessageInspectionEntries.guildId, guildId),
                eq(earlyMessageInspectionEntries.userId, userId)
            )
        });

        if (!entry) {
            this.updateQueue.set(`${guildId}::${userId}`, Number.NEGATIVE_INFINITY);
            return null;
        }

        this.updateQueue.set(`${entry.guildId}::${entry.userId}`, entry.messageCount);
        return entry.messageCount;
    }

    @Override
    public onGuildMemberAdd(member: GuildMember): Awaitable<void> {
        if (member.user.bot) {
            return;
        }

        this.updateQueue.set(`${member.guild.id}::${member.user.id}`, 0);
    }

    @Override
    public onGuildMemberRemove(member: GuildMember): Awaitable<void> {
        if (member.user.bot) {
            return;
        }

        this.updateQueue.delete(`${member.guild.id}::${member.user.id}`);
        this.deleteQueue.push(`${member.guild.id}::${member.user.id}`);
    }

    @Override
    public async onMessageCreate(message: Message<boolean>): Promise<void> {
        if (!message.inGuild() || message.author.bot) {
            return;
        }

        const count = await this.getMessageCount(message.guildId, message.author.id);

        if (count === null) {
            return;
        }

        const result = await this.paxmodModerateText(message.content);

        if (result.success && result.flagged) {
            //
        }

        this.updateQueue.set(`${message.guildId}::${message.author.id}`, count + 1);
        this.application.logger.debug(`Now: ${count + 1}`);
    }

    @Override
    public async onMessageUpdate(
        _oldMessage: Message<boolean> | PartialMessage,
        message: Message<boolean>
    ): Promise<void> {
        if (!message.inGuild() || message.author.bot || !message.content) {
            return;
        }

        const count = await this.getMessageCount(message.guildId, message.author.id);

        if (count === null) {
            return;
        }

        this.application.logger.debug(`Now: ${count} (not changed)`);
    }

    private async paxmodModerateText(text: string) {
        try {
            const response = await getAxiosClient().post<PaxmodModerateTextResponse>(
                "https://www.paxmod.com/api/v1/text",
                {
                    message: text
                }
            );

            if (response.data.status !== "success") {
                return { success: false, flagged: false };
            }

            if (response.data.result !== "flagged" && !response.data.content_moderation?.flagged) {
                return { success: true, flagged: false };
            }

            return {
                success: true,
                flagged: true,
                data: response.data
            };
        } catch (error) {
            this.application.logger.error(error);
            return { success: false, flagged: false };
        }
    }
}

export type PaxmodModerateTextSuccessResponse = {
    status: "success";
    id: string;
    service: string;
    request: {
        original_message: string;
        processed_message: string;
        timestamp: string;
    };
    result: "flagged" | "not_flagged";
    reason?: string;
    content_moderation?: {
        flagged: boolean;
        categories: Record<
            string,
            {
                flagged: boolean;
                score: number;
                threshold: number;
            }
        >;
    };
};

type PaxmodModerateTextErrorResponse = {
    status: "error";
    error: {
        code: string;
        message: string;
        details: string;
        timestamp: string;
    };
};

type PaxmodModerateTextResponse = PaxmodModerateTextErrorResponse | PaxmodModerateTextSuccessResponse;

export default EarlyMessageInspectionService;
