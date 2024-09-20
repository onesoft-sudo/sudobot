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
import { Events } from "@framework/types/ClientEvents";
import { fetchUser } from "@framework/utils/entities";
import { LogEventType } from "@main/schemas/LoggingSchema";
import type AuditLoggingService from "@main/services/AuditLoggingService";
import {
    AuditLogEvent,
    ReadonlyCollection,
    type GuildTextBasedChannel,
    type Message,
    type PartialMessage
} from "discord.js";

class MessageBulkDeleteEventListener extends EventListener<Events.MessageDeleteBulk> {
    public override readonly name = Events.MessageDeleteBulk;

    @Inject("auditLoggingService")
    protected readonly auditLoggingService!: AuditLoggingService;

    public override execute(
        messages: ReadonlyCollection<string, Message<boolean> | PartialMessage>,
        channel: GuildTextBasedChannel
    ): void {
        setTimeout(async () => {
            try {
                const logs = await channel.guild.fetchAuditLogs({
                    type: AuditLogEvent.MessageBulkDelete,
                    limit: 10
                });

                const log = logs.entries.find(
                    entry =>
                        entry.target?.id === channel.id &&
                        Date.now() - entry.createdTimestamp < 2200
                );

                const executorId = log?.executor?.id ?? log?.executorId;

                if (executorId && executorId === this.client.user?.id) {
                    return;
                }

                await this.auditLoggingService.emitLogEvent(
                    channel.guildId,
                    LogEventType.MessageDeleteBulk,
                    {
                        messages,
                        channel,
                        moderator:
                            log?.executor ??
                            (executorId
                                ? ((await fetchUser(this.client, executorId)) ?? undefined)
                                : undefined),
                        reason: log?.reason ?? undefined
                    }
                );
            } catch (error) {
                this.application.logger.error(
                    "An error occurred while processing a message bulk delete event",
                    error
                );
            }
        }, 1500);
    }
}

export default MessageBulkDeleteEventListener;
