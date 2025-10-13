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

import { Inject } from "@framework/container/Inject";
import EventListener from "@framework/events/EventListener";
import { NonPartialGroupDMChannel } from "@framework/types/ClientEvents";
import { fetchUser } from "@framework/utils/entities";
import type AuditLoggingService from "@main/services/AuditLoggingService";
import { LogEventType } from "@schemas/LoggingSchema";
import { AuditLogEvent, Events, Message, PartialMessage, Snowflake } from "discord.js";

class MessageDeleteEventListener extends EventListener<Events.MessageDelete> {
    public override readonly name = Events.MessageDelete;
    private readonly deleteCountMap = new Map<`${Snowflake}_${Snowflake}`, number>();

    @Inject("auditLoggingService")
    protected readonly auditLoggingService!: AuditLoggingService;

    public override onInitialize(): void {
        setInterval(() => this.deleteCountMap.clear(), 1_000 * 60 * 6);
    }

    private async findResponsibleModerator(message: Message) {
        try {
            const auditLogs = await message.guild!.fetchAuditLogs({
                type: AuditLogEvent.MessageDelete,
                limit: 10
            });

            const log = auditLogs.entries.find(entry => {
                if (
                    !(
                        entry.targetId === message.author.id &&
                        entry.actionType === "Delete" &&
                        entry.extra.channel.id === message.channelId &&
                        entry.createdTimestamp > Date.now() - 5000 &&
                        entry.executorId
                    )
                ) {
                    return false;
                }

                const prevCount = this.deleteCountMap.get(`${message.guildId!}_${entry.executorId}`) ?? 0;
                const result = prevCount + 1 === entry.extra.count;
                this.deleteCountMap.set(`${message.guildId!}_${entry.executorId}`, entry.extra.count);
                return result;
            });

            if (log && (log.executorId || log.executor)) {
                return log.executor ?? (await fetchUser(this.client, log.executorId!)) ?? undefined;
            }
        } catch (error) {
            this.application.logger.error("An error occurred while processing a message delete event", error);
        }

        return undefined;
    }

    public override async execute(message: NonPartialGroupDMChannel<Message | PartialMessage>) {
        if (message.partial) {
            try {
                await message.fetch();
            } catch (error) {
                this.application.logger.error("Failed to fetch message in MessageDeleteEventListener", error);
                return;
            }
        }

        if (message.author?.bot || message.webhookId || !message.inGuild()) {
            return;
        }

        setTimeout(async () => {
            const moderator = await this.findResponsibleModerator(message);

            this.auditLoggingService
                .emitLogEvent(message.guildId, LogEventType.MessageDelete, message, moderator)
                .catch(this.application.logger.error);
        }, 100);
    }
}

export default MessageDeleteEventListener;
