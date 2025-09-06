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

import { Inject } from "@framework/container/Inject";
import { Override } from "@framework/decorators/Override";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { HasEventListeners } from "@framework/types/HasEventListeners";
import { getEnvData } from "@main/env/env";
import {
    earlyMessageInspectionEntries,
    EarlyMessageInspectionEntryCreatePayload
} from "@main/models/EarlyMessageInspectionEntry";
import { LogEventType } from "@main/schemas/LoggingSchema";
import type AuditLoggingService from "@main/services/AuditLoggingService";
import type ConfigurationManager from "@main/services/ConfigurationManager";
import ModerationActionService from "@main/services/ModerationActionService";
import { getAxiosClient } from "@main/utils/axios";
import {
    type Awaitable,
    Collection,
    GuildMember,
    Message,
    type PartialMessage,
    type Snowflake,
    TextChannel
} from "discord.js";
import { and, eq, or, sql } from "drizzle-orm";

@Name("newMemberMessageInspectionService")
class NewMemberMessageInspectionService extends Service implements HasEventListeners {
    private readonly updateQueue = new Collection<`${Snowflake}::${Snowflake}`, number>();
    private readonly deleteQueue: Array<`${Snowflake}::${Snowflake}`> = [];

    @Inject("configManager")
    private readonly configManager!: ConfigurationManager;

    @Inject("auditLoggingService")
    private readonly auditLoggingService!: AuditLoggingService;

    @Inject("moderationActionService")
    private readonly moderationActionService!: ModerationActionService;

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

                this.application.logger.debug(NewMemberMessageInspectionService.name, "Keys updated: ", values.length);
            }

            if (this.deleteQueue.length) {
                const deleteQueue = this.deleteQueue;
                this.deleteQueue.length = 0;

                const conditions = [];

                for (const key of deleteQueue) {
                    const [guildId, userId] = key.split("::");

                    conditions.push(
                        and(
                            eq(earlyMessageInspectionEntries.guildId, guildId),
                            eq(earlyMessageInspectionEntries.userId, userId)
                        )
                    );
                }

                if (conditions.length) {
                    this.application.database.drizzle.delete(earlyMessageInspectionEntries).where(or(...conditions));
                }

                this.application.logger.debug(
                    NewMemberMessageInspectionService.name,
                    "Keys deleted: ",
                    conditions.length
                );
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
        if (member.user.bot || !this.configManager.config[member.guild.id]?.new_member_message_inspection?.enabled) {
            return;
        }

        this.updateQueue.set(`${member.guild.id}::${member.user.id}`, 0);
    }

    @Override
    public onGuildMemberRemove(member: GuildMember): Awaitable<void> {
        if (member.user.bot || !this.configManager.config[member.guild.id]?.new_member_message_inspection?.enabled) {
            return;
        }

        this.updateQueue.delete(`${member.guild.id}::${member.user.id}`);
        this.deleteQueue.push(`${member.guild.id}::${member.user.id}`);
    }

    @Override
    public async onMessageCreate(message: Message<boolean>): Promise<void> {
        if (
            !message.inGuild() ||
            message.author.bot ||
            !message.member ||
            !this.configManager.config[message.guildId]?.new_member_message_inspection?.enabled
        ) {
            return;
        }

        const count = await this.getMessageCount(message.guildId, message.author.id);
        const maxCount =
            this.configManager.config[message.guildId]?.new_member_message_inspection
                ?.inspect_member_messages_until_count ?? 10;

        if (count === null) {
            this.application.logger.debug(
                NewMemberMessageInspectionService.name,
                "No entries for this member: ",
                message.author.id
            );
            return;
        }

        if (count > maxCount) {
            this.updateQueue.delete(`${message.guildId}::${message.author.id}`);
            this.application.database.drizzle
                .delete(earlyMessageInspectionEntries)
                .where(
                    and(
                        eq(earlyMessageInspectionEntries.guildId, message.guildId),
                        eq(earlyMessageInspectionEntries.userId, message.author.id)
                    )
                );

            this.application.logger.debug(
                NewMemberMessageInspectionService.name,
                "Max messages reached, removing entry:",
                message.author.id
            );
            return;
        }

        const result = await this.paxmodModerateText(message.content);
        this.application.logger.debug(NewMemberMessageInspectionService.name, "Paxmod response", result.data);

        if (result.success && result.flagged && result.data) {
            await this.onFlag(message, result.data);
        }

        this.updateQueue.set(`${message.guildId}::${message.author.id}`, count + 1);
        this.application.logger.debug(NewMemberMessageInspectionService.name, `Now: ${count + 1}`);
    }

    @Override
    public async onMessageUpdate(
        _oldMessage: Message<boolean> | PartialMessage,
        message: Message<boolean>
    ): Promise<void> {
        if (
            !message.inGuild() ||
            message.author.bot ||
            !message.content ||
            !message.member ||
            !this.configManager.config[message.guildId]?.new_member_message_inspection?.enabled
        ) {
            return;
        }

        const count = await this.getMessageCount(message.guildId, message.author.id);
        const maxCount =
            this.configManager.config[message.guildId]?.new_member_message_inspection
                ?.inspect_member_messages_until_count ?? 10;

        if (count === null) {
            return;
        }

        if (count > maxCount) {
            this.updateQueue.delete(`${message.guildId}::${message.author.id}`);
            this.application.database.drizzle
                .delete(earlyMessageInspectionEntries)
                .where(
                    and(
                        eq(earlyMessageInspectionEntries.guildId, message.guildId),
                        eq(earlyMessageInspectionEntries.userId, message.author.id)
                    )
                );

            return;
        }

        const result = await this.paxmodModerateText(message.content);

        if (result.success && result.flagged && result.data) {
            await this.onFlag(message, result.data);
        }

        this.application.logger.debug(NewMemberMessageInspectionService.name, `Now: ${count} (not changed)`);
    }

    private async onFlag(message: Message<true>, data: PaxmodModerateTextSuccessResponse) {
        if (!message.member) {
            return;
        }

        const config = this.configManager.config[message.guildId]?.new_member_message_inspection;

        if (!config?.enabled) {
            return;
        }

        const promise1 = this.auditLoggingService.emitLogEvent(
            message.guildId,
            LogEventType.NewMemberMessageInspection,
            {
                data,
                member: message.member,
                message,
                mentions: config?.mention_in_logs_on_flag ?? []
            }
        );

        const promise2 = config.action_on_flag?.length
            ? await this.moderationActionService.takeActions(
                  message.guild,
                  message.member,
                  config.action_on_flag.map(action => ({
                      ...action,
                      reason:
                          "reason" in action && action.reason
                              ? action.reason
                              : `Your message was flagged: ${data.reason}`
                  })),
                  {
                      channel: message.channel as TextChannel,
                      message
                  }
              )
            : null;

        await Promise.all([promise1, promise2]);
    }

    private async paxmodModerateText(text: string) {
        try {
            const response = await getAxiosClient().post<PaxmodModerateTextResponse>(
                "https://www.paxmod.com/api/v1/text",
                {
                    message: text
                },
                {
                    headers: {
                        Authorization: `Bearer ${getEnvData().PAXMOD_API_KEY}`
                    }
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

export default NewMemberMessageInspectionService;
