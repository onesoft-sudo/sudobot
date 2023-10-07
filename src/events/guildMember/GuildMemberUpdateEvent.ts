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
import { AuditLogEvent, Events, GuildMember } from "discord.js";
import EventListener from "../../core/EventListener";
import { logError } from "../../utils/logger";

export default class GuildMemberUpdateEvent extends EventListener<Events.GuildMemberUpdate> {
    public readonly name = Events.GuildMemberUpdate;

    async execute(oldMember: GuildMember, newMember: GuildMember) {
        super.execute(oldMember, newMember);

        if (oldMember.nickname !== newMember.nickname) {
            await this.client.logger.logNicknameUpdate(oldMember, newMember);
        }

        if (!oldMember.roles.cache.equals(newMember.roles.cache)) {
            await this.client.logger.logMemberRoleUpdate(oldMember, newMember);
        }

        if (!oldMember.communicationDisabledUntil && newMember.communicationDisabledUntil) {
            setTimeout(async () => {
                try {
                    const auditLog = (
                        await newMember.guild.fetchAuditLogs({
                            limit: 1,
                            type: AuditLogEvent.MemberUpdate
                        })
                    ).entries.first();

                    if (auditLog?.executor?.id && auditLog.executor.id !== this.client.user?.id) {
                        const timeout = auditLog.changes.reverse().find(change => change.key === "communication_disabled_until");

                        if (!timeout) return;

                        const infraction = await this.client.prisma.infraction.create({
                            data: {
                                guildId: newMember.guild.id,
                                moderatorId: auditLog.executor.id,
                                type: InfractionType.TIMEOUT,
                                userId: newMember.user.id,
                                reason: auditLog.reason ?? undefined
                            }
                        });

                        await this.client.logger.logMemberTimeout(newMember, {
                            moderator: auditLog.executor,
                            id: infraction.id.toString(),
                            reason: auditLog.reason ?? undefined
                        });
                    }
                } catch (e) {
                    logError(e);
                }
            }, 3500);
        } else if (oldMember.communicationDisabledUntil && !newMember.communicationDisabledUntil) {
            setTimeout(async () => {
                try {
                    const auditLog = (
                        await newMember.guild.fetchAuditLogs({
                            limit: 1,
                            type: AuditLogEvent.MemberUpdate
                        })
                    ).entries.first();

                    if (auditLog?.executor?.id && auditLog.executor.id !== this.client.user?.id) {
                        const infraction = await this.client.prisma.infraction.create({
                            data: {
                                guildId: newMember.guild.id,
                                moderatorId: auditLog.executor.id,
                                type: InfractionType.TIMEOUT_REMOVE,
                                userId: newMember.user.id
                            }
                        });

                        await this.client.logger.logMemberTimeoutRemove(newMember, {
                            moderator: auditLog.executor,
                            id: infraction.id.toString()
                        });
                    }
                } catch (e) {
                    logError(e);
                }
            }, 2000);
        }
    }
}
