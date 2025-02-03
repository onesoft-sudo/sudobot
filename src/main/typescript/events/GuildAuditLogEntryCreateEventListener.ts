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
import { fetchMember, fetchUser } from "@framework/utils/entities";
import { InfractionDeliveryStatus, infractions, InfractionType } from "@main/models/Infraction";
import { LogEventType } from "@main/schemas/LoggingSchema";
import type AuditLoggingService from "@main/services/AuditLoggingService";
import { AuditLogEvent, Guild, GuildAuditLogsEntry, GuildMember, User } from "discord.js";

class GuildAuditLogEntryCreateEventListener extends EventListener<Events.GuildAuditLogEntryCreate> {
    public override readonly name = Events.GuildAuditLogEntryCreate;

    @Inject("auditLoggingService")
    protected readonly auditLoggingService!: AuditLoggingService;

    public override async execute(auditLogEntry: GuildAuditLogsEntry, guild: Guild): Promise<void> {
        if (auditLogEntry.action === AuditLogEvent.MemberRoleUpdate) {
            const executor =
                (auditLogEntry.executor ?? auditLogEntry.executorId)
                    ? await fetchUser(this.client, auditLogEntry.executorId!)
                    : null;

            if (executor && executor.id === this.client.user?.id) {
                return;
            }

            if (!auditLogEntry.targetId) {
                return;
            }

            const member =
                auditLogEntry.target instanceof GuildMember
                    ? auditLogEntry.target
                    : await fetchMember(guild, auditLogEntry.targetId);

            if (!member) {
                return;
            }

            const removed = auditLogEntry.changes
                .find(change => change.key === "$remove")
                ?.new?.map(r => r.id);
            const added = auditLogEntry.changes
                .find(change => change.key === "$add")
                ?.new?.map(r => r.id);

            if (!removed?.length && !added?.length) {
                return;
            }

            this.auditLoggingService
                .emitLogEvent(guild.id, LogEventType.MemberRoleModification, {
                    guild,
                    moderator: executor ?? undefined,
                    member,
                    reason: auditLogEntry.reason ?? undefined,
                    added,
                    removed
                })
                .catch(this.application.logger.error);

            return;
        }

        if (
            auditLogEntry.action === AuditLogEvent.MemberBanAdd ||
            auditLogEntry.action === AuditLogEvent.MemberBanRemove
        ) {
            const executor =
                (auditLogEntry.executor ?? auditLogEntry.executorId)
                    ? await fetchUser(this.client, auditLogEntry.executorId!)
                    : null;

            if (executor && executor.id === this.client.user?.id) {
                return;
            }

            const user =
                auditLogEntry.target instanceof GuildMember
                    ? auditLogEntry.target.user
                    : (auditLogEntry.target as User);

            if (!user) {
                return;
            }

            const [infraction] = await this.application.database.drizzle
                .insert(infractions)
                .values({
                    guildId: guild.id,
                    moderatorId: executor?.id ?? "0",
                    userId: user.id,
                    type:
                        auditLogEntry.action === AuditLogEvent.MemberBanAdd
                            ? InfractionType.Ban
                            : InfractionType.Unban,
                    reason: auditLogEntry.reason ?? undefined,
                    deliveryStatus: InfractionDeliveryStatus.NotDelivered
                })
                .returning({ id: infractions.id });

            this.auditLoggingService
                .emitLogEvent(
                    guild.id,
                    auditLogEntry.action === AuditLogEvent.MemberBanAdd
                        ? LogEventType.MemberBanAdd
                        : LogEventType.MemberBanRemove,
                    {
                        guild,
                        moderator: executor ?? undefined,
                        user,
                        reason: auditLogEntry.reason ?? undefined,
                        infractionId: infraction.id
                    }
                )
                .catch(this.application.logger.error);
        }
    }
}

export default GuildAuditLogEntryCreateEventListener;
