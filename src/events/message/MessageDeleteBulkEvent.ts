/*
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

import { AuditLogEvent, Collection, GuildTextBasedChannel, Message, PartialMessage, Snowflake, TextChannel } from "discord.js";
import EventListener from "../../core/EventListener";
import { Events } from "../../types/ClientEvents";
import { logError } from "../../utils/Logger";

export default class MessageDeleteBulkEvent extends EventListener<Events.MessageDeleteBulk> {
    public readonly name = Events.MessageDeleteBulk;

    async execute(messages: Collection<Snowflake, Message | PartialMessage>, channel: GuildTextBasedChannel) {
        setTimeout(async () => {
            try {
                const auditLog = (
                    await channel.guild.fetchAuditLogs({
                        limit: 1,
                        type: AuditLogEvent.MessageBulkDelete
                    })
                ).entries.first();

                if (auditLog?.executor?.id && auditLog.executor.id !== this.client.user?.id) {
                    await this.client.infractionManager.bulkDeleteMessages({
                        logOnly: true,
                        sendLog: true,
                        guild: channel.guild,
                        moderator: auditLog.executor,
                        messageChannel: channel as TextChannel,
                        messagesToDelete: [...messages.values()] as Message[]
                    });
                }
            } catch (e) {
                logError(e);
            }
        }, 2000);
    }
}
