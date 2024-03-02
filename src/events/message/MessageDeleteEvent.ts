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

import { AuditLogEvent, ChannelType, Message, User } from "discord.js";
import EventListener from "../../core/EventListener";
import { Events } from "../../types/ClientEvents";

export default class MessageDeleteEvent extends EventListener<Events.MessageDelete> {
    public readonly name = Events.MessageDelete;

    async execute(message: Message) {
        const deletedTimestamp = Date.now();

        super.execute(message);

        if (message.author.bot || !message.guild || !message.inGuild()) return;

        this.client.emit(Events.NormalMessageDelete, message);
        this.client.statsService.onMessageDelete(message);

        setTimeout(async () => {
            const auditLogEntries = await message.guild
                .fetchAuditLogs({
                    type: AuditLogEvent.MessageDelete,
                    limit: 10
                })
                .catch(() => null);

            const auditLogEntry = auditLogEntries?.entries.find(
                e =>
                    e.createdAt.getTime() - deletedTimestamp <= 2_000 &&
                    e.targetId === message.author.id &&
                    e.executorId !== message.author.id
            );

            let moderator: User | null = null;

            if (auditLogEntry) {
                moderator = auditLogEntry.executor;
            }

            await this.client.loggerService.logMessageDelete(message, moderator);
        }, 1000);
    }
}
