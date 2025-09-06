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
import NewMemberMessageInspectionService from "@main/automod/NewMemberMessageInspectionService";
import { InfractionDeliveryStatus, infractions, InfractionType } from "@main/models/Infraction";
import { LogEventType } from "@main/schemas/LoggingSchema";
import type AuditLoggingService from "@main/services/AuditLoggingService";
import type InfractionManager from "@main/services/InfractionManager";
import { AuditLogEvent, User, type GuildMember } from "discord.js";

class GuildMemberRemoveEventListener extends EventListener<Events.GuildMemberRemove> {
    public override readonly name = Events.GuildMemberRemove;

    @Inject("auditLoggingService")
    protected readonly auditLoggingService!: AuditLoggingService;

    @Inject("infractionManager")
    protected readonly infractionManager!: InfractionManager;

    @Inject("newMemberMessageInspectionService")
    protected readonly newMemberMessageInspectionService!: NewMemberMessageInspectionService;

    public override async execute(member: GuildMember): Promise<void> {
        if (member.id === this.application.client.user?.id) {
            return;
        }

        setTimeout(async () => {
            try {
                const logs = await member.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberKick,
                    limit: 10
                });

                const log = logs.entries.find(
                    entry =>
                        (entry.target?.id ?? entry.targetId) === member.id && Date.now() - entry.createdTimestamp < 3000
                );

                const executorId = log?.executor?.id ?? log?.executorId;

                if (log && (!executorId || executorId !== this.client.user?.id)) {
                    const [infraction] = await this.application.database.drizzle
                        .insert(infractions)
                        .values({
                            guildId: member.guild.id,
                            userId: member.id,
                            moderatorId: executorId ?? "0",
                            type: InfractionType.Kick,
                            reason: log.reason ?? undefined,
                            deliveryStatus: InfractionDeliveryStatus.NotDelivered
                        })
                        .returning({ id: infractions.id });

                    this.auditLoggingService
                        .emitLogEvent(member.guild.id, LogEventType.GuildMemberKick, {
                            member,
                            moderator:
                                log.executor && log.executor instanceof User
                                    ? log.executor
                                    : executorId
                                      ? ((await fetchUser(this.client, executorId)) ?? undefined)
                                      : undefined,
                            reason: log.reason ?? undefined,
                            infractionId: infraction.id
                        })
                        .catch(this.application.logger.error);
                }

                this.auditLoggingService
                    .emitLogEvent(member.guild.id, LogEventType.GuildMemberRemove, member)
                    .catch(this.application.logger.error);
            } catch (error) {
                this.application.logger.error("An error occurred while processing the GuildMemberRemove event", error);
            }
        }, 2500);

        await this.newMemberMessageInspectionService.onGuildMemberRemove(member);
    }
}

export default GuildMemberRemoveEventListener;
