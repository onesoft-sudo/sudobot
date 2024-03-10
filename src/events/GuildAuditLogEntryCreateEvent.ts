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

import { InfractionType } from "@prisma/client";
import {
    AuditLogEvent,
    Guild,
    GuildAuditLogsActionType,
    GuildAuditLogsEntry,
    GuildAuditLogsTargetType,
    GuildMember,
    User,
    VoiceChannel
} from "discord.js";
import EventListener from "../core/EventListener";
import { safeMemberFetch, safeUserFetch } from "../utils/fetch";

export default class GuildAuditLogEntryCreateEventListener extends EventListener<"guildAuditLogEntryCreate"> {
    public readonly name = "guildAuditLogEntryCreate";

    async execute(
        auditLogEntry: GuildAuditLogsEntry<
            AuditLogEvent,
            GuildAuditLogsActionType,
            GuildAuditLogsTargetType,
            AuditLogEvent
        >,
        guild: Guild
    ): Promise<void> {
        if (auditLogEntry.action === AuditLogEvent.MemberBanAdd) {
            const { executorId, executor, targetId, reason, target } = auditLogEntry;
            const user =
                target instanceof User
                    ? target
                    : target instanceof GuildMember
                    ? target.user
                    : targetId
                    ? await safeUserFetch(this.client, targetId)
                    : null;

            if (user && executorId && executorId !== this.client.user?.id) {
                const infraction = await this.client.prisma.infraction.create({
                    data: {
                        guildId: guild.id,
                        moderatorId: executorId,
                        type: InfractionType.BAN,
                        userId: user.id,
                        reason: reason ?? undefined
                    }
                });

                await this.client.loggerService.logUserBan({
                    moderator:
                        executor ??
                        (await safeUserFetch(this.client, executorId)) ??
                        ({
                            ...this.client.user!,
                            username: "Unknown",
                            id: executorId
                        } as unknown as User),
                    user,
                    guild,
                    id: infraction.id.toString(),
                    includeDeleteMessageSeconds: false,
                    reason: reason ?? undefined
                });
            }
        } else if (auditLogEntry.action === AuditLogEvent.MemberKick) {
            const { executorId, executor, targetId, reason, target } = auditLogEntry;
            const user =
                target instanceof User
                    ? target
                    : target instanceof GuildMember
                    ? target.user
                    : targetId
                    ? await safeUserFetch(this.client, targetId)
                    : null;

            if (user && executorId && executorId !== this.client.user?.id) {
                const infraction = await this.client.prisma.infraction.create({
                    data: {
                        guildId: guild.id,
                        moderatorId: executorId,
                        type: InfractionType.KICK,
                        userId: user.id,
                        reason: reason ?? undefined
                    }
                });

                await this.client.loggerService.logMemberKick({
                    moderator:
                        executor ??
                        (await safeUserFetch(this.client, executorId)) ??
                        ({
                            ...this.client.user!,
                            username: "Unknown",
                            id: executorId
                        } as unknown as User),
                    user,
                    guild,
                    id: infraction.id.toString(),
                    reason: reason ?? undefined
                });
            }
        } else if (auditLogEntry.action === AuditLogEvent.MemberUpdate) {
            const lastChange = auditLogEntry.changes.at(-1);
            const channel = (await safeMemberFetch(guild, auditLogEntry.targetId!))?.voice
                ?.channel as VoiceChannel | null;

            if (!lastChange || !channel) {
                return;
            }

            if (lastChange.key === "mute") {
                if (lastChange.old === false && lastChange.new === true) {
                    await this.client.loggerService.logMemberVoiceMute({
                        user: auditLogEntry.target as User,
                        guild,
                        moderator: auditLogEntry.executor ?? undefined,
                        reason: auditLogEntry.reason ?? undefined,
                        channel
                    });
                } else if (lastChange.old === true && lastChange.new === false) {
                    await this.client.loggerService.logMemberVoiceUnmute({
                        user: auditLogEntry.target as User,
                        guild,
                        moderator: auditLogEntry.executor ?? undefined,
                        reason: auditLogEntry.reason ?? undefined,
                        channel
                    });
                }
            }

            if (lastChange.key === "deaf") {
                if (lastChange.old === false && lastChange.new === true) {
                    await this.client.loggerService.logMemberDeaf({
                        user: auditLogEntry.target as User,
                        guild,
                        moderator: auditLogEntry.executor ?? undefined,
                        reason: auditLogEntry.reason ?? undefined,
                        channel
                    });
                } else if (lastChange.old === true && lastChange.new === false) {
                    await this.client.loggerService.logMemberUndeaf({
                        user: auditLogEntry.target as User,
                        guild,
                        moderator: auditLogEntry.executor ?? undefined,
                        reason: auditLogEntry.reason ?? undefined,
                        channel
                    });
                }
            }
        }
    }
}
