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

import { InfractionType } from "@prisma/client";
import { AuditLogEvent, GuildBan } from "discord.js";
import EventListener from "../../core/EventListener";
import { Events } from "../../types/ClientEvents";
import { logError } from "../../utils/logger";

export default class GuildBanAddEvent extends EventListener<Events.GuildBanAdd> {
    public readonly name = Events.GuildBanAdd;

    async execute(ban: GuildBan) {
        super.execute(ban);

        setTimeout(async () => {
            try {
                const auditLog = (
                    await ban.guild.fetchAuditLogs({
                        limit: 1,
                        type: AuditLogEvent.MemberBanAdd
                    })
                ).entries.first();

                if (auditLog?.executor?.id && auditLog.executor.id !== this.client.user?.id) {
                    const infraction = await this.client.prisma.infraction.create({
                        data: {
                            guildId: ban.guild.id,
                            moderatorId: auditLog.executor.id,
                            type: InfractionType.BAN,
                            userId: ban.user.id,
                            reason: ban.reason ?? undefined
                        }
                    });

                    await this.client.logger.logUserBan({
                        moderator: auditLog.executor,
                        user: ban.user,
                        guild: ban.guild,
                        id: infraction.id.toString(),
                        includeDeleteMessageSeconds: false,
                        reason: ban.reason ?? undefined
                    });
                }
            } catch (e) {
                logError(e);
            }
        }, 5500);
    }
}
