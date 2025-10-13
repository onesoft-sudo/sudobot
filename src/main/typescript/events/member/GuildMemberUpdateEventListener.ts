/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025 OSN Developers.
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
import Duration from "@framework/datetime/Duration";
import EventListener from "@framework/events/EventListener";
import { Events } from "@framework/types/ClientEvents";
import { InfractionDeliveryStatus, infractions, InfractionType } from "@main/models/Infraction";
import type AuditLoggingService from "@main/services/AuditLoggingService";
import { LogEventType } from "@schemas/LoggingSchema";
import { AuditLogEvent, type GuildMember } from "discord.js";

class GuildMemberUpdateEventListener extends EventListener<Events.GuildMemberUpdate> {
    public override readonly name = Events.GuildMemberUpdate;

    @Inject("auditLoggingService")
    protected readonly auditLoggingService!: AuditLoggingService;

    public override execute(oldMember: GuildMember, newMember: GuildMember) {
        if (
            oldMember.nickname !== newMember.nickname ||
            oldMember.communicationDisabledUntilTimestamp !== newMember.communicationDisabledUntilTimestamp
        ) {
            setTimeout(async () => {
                try {
                    const logs = await newMember.guild.fetchAuditLogs({
                        type: AuditLogEvent.MemberUpdate,
                        limit: 1
                    });

                    const log = logs.entries.first();

                    if (!log) {
                        return;
                    }

                    if (log.createdTimestamp < Date.now() - 5000) {
                        return;
                    }

                    const executor = log.executor;

                    if (executor && executor.id === this.client.user?.id) {
                        return;
                    }

                    const moderator = executor && executor.id === newMember.id ? undefined : (executor ?? undefined);

                    if (oldMember.nickname !== newMember.nickname) {
                        await this.auditLoggingService.emitLogEvent(
                            newMember.guild.id,
                            LogEventType.MemberNicknameModification,
                            {
                                member: newMember,
                                oldNickname: oldMember.nickname,
                                newNickname: newMember.nickname,
                                guild: newMember.guild,
                                moderator
                            }
                        );
                    }

                    if (
                        oldMember.communicationDisabledUntilTimestamp !==
                            newMember.communicationDisabledUntilTimestamp &&
                        moderator
                    ) {
                        const added =
                            oldMember.communicationDisabledUntilTimestamp === null &&
                            newMember.communicationDisabledUntilTimestamp !== null;

                        const [infraction] = await this.application.database.drizzle
                            .insert(infractions)
                            .values({
                                guildId: newMember.guild.id,
                                moderatorId: executor?.id ?? "0",
                                userId: newMember.user.id,
                                type: added ? InfractionType.Timeout : InfractionType.TimeoutRemove,
                                reason: log.reason ?? undefined,
                                deliveryStatus: InfractionDeliveryStatus.NotDelivered,
                                expiresAt: added ? newMember.communicationDisabledUntil : undefined
                            })
                            .returning({ id: infractions.id });

                        if (added) {
                            await this.auditLoggingService.emitLogEvent(
                                newMember.guild.id,
                                LogEventType.MemberTimeoutAdd,
                                {
                                    member: newMember,
                                    guild: newMember.guild,
                                    moderator,
                                    reason: log.reason ?? undefined,
                                    duration: Duration.fromMilliseconds(
                                        Math.round(
                                            ((newMember.communicationDisabledUntilTimestamp ?? 0) -
                                                log.createdTimestamp) /
                                                1000
                                        ) * 1000
                                    ),
                                    infractionId: infraction.id
                                }
                            );
                        } else {
                            await this.auditLoggingService.emitLogEvent(
                                newMember.guild.id,
                                LogEventType.MemberTimeoutRemove,
                                {
                                    member: newMember,
                                    guild: newMember.guild,
                                    moderator,
                                    reason: log.reason ?? undefined,
                                    infractionId: infraction.id
                                }
                            );
                        }
                    }
                } catch (error) {
                    this.application.logger.error(error);
                }
            }, 2500);
        }
    }
}

export default GuildMemberUpdateEventListener;
