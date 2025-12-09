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
import { earlyMessageInspectionEntries } from "@main/models/EarlyMessageInspectionEntry";
import type AuditLoggingService from "@main/services/AuditLoggingService";
import type ConfigurationManager from "@main/services/ConfigurationManager";
import ModerationActionService from "@main/services/ModerationActionService";
import { getAxiosClient } from "@main/utils/axios";
import { LogEventType } from "@schemas/LoggingSchema";
import { GuildMember, Message, type PartialMessage, type Snowflake, TextChannel } from "discord.js";
import { and, eq, sql } from "drizzle-orm";
import { regexes } from "zod";

@Name("newMemberMessageInspectionService")
class NewMemberMessageInspectionService extends Service implements HasEventListeners {
    private readonly trustedCache = new Set<`${Snowflake}::${Snowflake}`>();

    @Inject("configManager")
    private readonly configManager!: ConfigurationManager;

    @Inject("auditLoggingService")
    private readonly auditLoggingService!: AuditLoggingService;

    @Inject("moderationActionService")
    private readonly moderationActionService!: ModerationActionService;

    public override boot() {
        setInterval(() => {
            this.trustedCache.clear();
        }, 30_000);
    }

    private async getMessageCountAndIncrement(guildId: Snowflake, userId: Snowflake) {
        if (this.trustedCache.has(`${guildId}::${userId}`)) {
            this.application.logger.debug(NewMemberMessageInspectionService.name, "This user is known: ", userId);
            return null;
        }

        const entry = (
            await this.application.database.drizzle
                .update(earlyMessageInspectionEntries)
                .set({
                    messageCount: sql.raw(`${earlyMessageInspectionEntries.messageCount.name} + 1`)
                })
                .where(
                    and(
                        eq(earlyMessageInspectionEntries.guildId, guildId),
                        eq(earlyMessageInspectionEntries.userId, userId)
                    )
                )
                .returning()
        )?.[0];

        if (!entry) {
            this.trustedCache.add(`${guildId}::${userId}`);
            return null;
        }

        return entry.messageCount;
    }

    private async getMessageCount(guildId: Snowflake, userId: Snowflake) {
        if (this.trustedCache.has(`${guildId}::${userId}`)) {
            this.application.logger.debug(NewMemberMessageInspectionService.name, "This user is known: ", userId);
            return null;
        }

        const entry = await this.application.database.query.earlyMessageInspectionEntries.findFirst({
            where: and(
                eq(earlyMessageInspectionEntries.guildId, guildId),
                eq(earlyMessageInspectionEntries.userId, userId)
            )
        });

        if (!entry) {
            this.trustedCache.add(`${guildId}::${userId}`);
            return null;
        }

        return entry.messageCount;
    }

    @Override
    public async onGuildMemberAdd(member: GuildMember): Promise<void> {
        if (member.user.bot || !this.configManager.config[member.guild.id]?.new_member_message_inspection?.enabled) {
            return;
        }

        this.trustedCache.delete(`${member.guild.id}::${member.user.id}`);
        await this.application.database.drizzle.insert(earlyMessageInspectionEntries).values({
            guildId: member.guild.id,
            userId: member.user.id,
            messageCount: 0
        });
    }

    @Override
    public async onGuildMemberRemove(member: GuildMember): Promise<void> {
        if (member.user.bot || !this.configManager.config[member.guild.id]?.new_member_message_inspection?.enabled) {
            return;
        }

        this.trustedCache.delete(`${member.guild.id}::${member.user.id}`);
        await this.application.database.drizzle
            .delete(earlyMessageInspectionEntries)
            .where(
                and(
                    eq(earlyMessageInspectionEntries.guildId, member.guild.id),
                    eq(earlyMessageInspectionEntries.userId, member.user.id)
                )
            );
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

        const count = await this.getMessageCountAndIncrement(message.guildId, message.author.id);
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
            this.trustedCache.add(`${message.guildId}::${message.author.id}`);
            await this.application.database.drizzle
                .delete(earlyMessageInspectionEntries)
                .where(
                    and(
                        eq(earlyMessageInspectionEntries.guildId, message.guildId),
                        eq(earlyMessageInspectionEntries.userId, message.author.id)
                    )
                );

            this.application.logger.debug(
                NewMemberMessageInspectionService.name,
                "Max messages reached, trusting member:",
                message.author.id
            );

            return;
        }

        const result = await this.paxmodModerateText(
            message.content,
            message.attachments
                .map(a => (!a.contentType || a.contentType?.startsWith("image/") ? a.proxyURL : null))
                .filter(a => a !== null)
        );
        this.application.logger.debug(NewMemberMessageInspectionService.name, "Paxmod response", result.data);

        if (result.success && result.flagged && result.data) {
            await this.onFlag(message, result.data);
        }

        this.application.logger.debug(NewMemberMessageInspectionService.name, `[${message.author.id}] Now: ${count}`);
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
            this.trustedCache.add(`${message.guildId}::${message.author.id}`);
            await this.application.database.drizzle
                .delete(earlyMessageInspectionEntries)
                .where(
                    and(
                        eq(earlyMessageInspectionEntries.guildId, message.guildId),
                        eq(earlyMessageInspectionEntries.userId, message.author.id)
                    )
                );

            this.application.logger.debug(
                NewMemberMessageInspectionService.name,
                "Max messages reached, trusting member:",
                message.author.id
            );

            return;
        }

        const result = await this.paxmodModerateText(message.content, []);

        if (result.success && result.flagged && result.data) {
            await this.onFlag(message, result.data);
        }

        this.application.logger.debug(
            NewMemberMessageInspectionService.name,
            `[${message.author.id}] Now (unchanged): ${count}`
        );
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
                              ? action.reason?.replace("{{reason}}", data.reason || "")
                              : `Your message was flagged: ${data.reason}`
                  })),
                  {
                      channel: message.channel as TextChannel,
                      message
                  }
              )
            : null;

        await Promise.all([promise1, promise2] as unknown as Promise<unknown>[]);
    }

    private async paxmodModerateText(text: string, fileURLs: string[], autoScan = true) {
        const scannedTexts: string[] = [];
        const matches = new Set<string>();
        const OCR_SPACE_API_KEY = process.env.OCR_SPACE_API_KEY;

        if (OCR_SPACE_API_KEY && autoScan) {
            const regex = /(https?:\/\/)?((([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})|localhost)(:\d{1,5})?(\/[^\s]*)?/gi;

            for (const [str] of text.matchAll(regex) || []) {
                if (str) {
                    matches.add(str);
                }
            }
        }

        console.log(fileURLs, matches);

        if (OCR_SPACE_API_KEY) {
            for (const fileURL of [...fileURLs, ...matches]) {
                try {
                    const response = await getAxiosClient().get<OCRSpaceScanResult>(
                        `https://api.ocr.space/parse/imageurl?apikey=${encodeURIComponent(OCR_SPACE_API_KEY)}&url=${encodeURIComponent(fileURL)}`
                    );

                    if (
                        !response.data.IsErroredOnProcessing &&
                        !response.data.ParsedResults?.[0].ErrorMessage &&
                        !response.data.ParsedResults?.[0].ErrorDetails &&
                        response.data.ParsedResults?.[0].ParsedText
                    ) {
                        scannedTexts.push(response.data.ParsedResults?.[0].ParsedText);
                    }
                } catch (error) {
                    this.application.logger.error(error);
                    continue;
                }
            }
        }

        console.log("Texts:", scannedTexts);

        for (const message of [text, ...scannedTexts]) {
            if (!message.trim()) {
                continue;
            }

            try {
                const response = await getAxiosClient().post<PaxmodModerateTextResponse>(
                    "https://www.paxmod.com/api/v1/text",
                    {
                        message
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${getEnvData().PAXMOD_API_KEY}`,
                            "Content-Type": "application/json"
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

        return { success: true, flagged: false };
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

type OCRSpaceScanResult = {
    ParsedResults?: Array<{
        ParsedText?: string;
        ErrorMessage?: string;
        ErrorDetails?: string;
    }>;
    IsErroredOnProcessing?: boolean;
};

export default NewMemberMessageInspectionService;
