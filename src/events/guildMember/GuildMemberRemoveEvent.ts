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
import { AuditLogEvent, ClientEvents, GuildMember } from "discord.js";
import EventListener from "../../core/EventListener";
import { logError } from "../../utils/logger";

export default class GuildMemberRemoveEvent extends EventListener {
    public name: keyof ClientEvents = "guildMemberRemove";

    async execute(member: GuildMember) {
        super.execute(member);
        await this.client.logger.logGuildMemberRemove(member);

        setTimeout(async () => {
            try {
                const auditLog = (
                    await member.guild.fetchAuditLogs({
                        limit: 1,
                        type: AuditLogEvent.MemberKick
                    })
                ).entries.first();

                if (
                    auditLog?.executor?.id &&
                    auditLog.executor.id !== this.client.user?.id &&
                    auditLog.targetId === member.user.id
                ) {
                    const infraction = await this.client.prisma.infraction.create({
                        data: {
                            guildId: member.guild.id,
                            moderatorId: auditLog.executor.id,
                            type: InfractionType.KICK,
                            userId: member.user.id,
                            reason: auditLog.reason ?? undefined
                        }
                    });

                    await this.client.logger.logMemberKick({
                        moderator: auditLog.executor,
                        id: infraction.id.toString(),
                        reason: auditLog.reason ?? undefined,
                        guild: member.guild,
                        member
                    });
                }
            } catch (e) {
                logError(e);
            }
        }, 2000);
    }
}
