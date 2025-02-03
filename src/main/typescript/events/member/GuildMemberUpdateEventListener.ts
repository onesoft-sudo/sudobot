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
import EventListener from "@framework/events/EventListener";
import { Events } from "@framework/types/ClientEvents";
import { LogEventType } from "@main/schemas/LoggingSchema";
import type AuditLoggingService from "@main/services/AuditLoggingService";
import { AuditLogEvent, type GuildMember } from "discord.js";

class GuildMemberUpdateEventListener extends EventListener<Events.GuildMemberUpdate> {
    public override readonly name = Events.GuildMemberUpdate;

    @Inject("auditLoggingService")
    protected readonly auditLoggingService!: AuditLoggingService;

    public override execute(oldMember: GuildMember, newMember: GuildMember) {
        if (oldMember.nickname === newMember.nickname) {
            return;
        }

        setTimeout(async () => {
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

            await this.auditLoggingService.emitLogEvent(
                newMember.guild.id,
                LogEventType.MemberNicknameModification,
                {
                    member: newMember,
                    oldNickname: oldMember.nickname,
                    newNickname: newMember.nickname,
                    guild: newMember.guild,
                    moderator:
                        executor && executor.id === newMember.id
                            ? undefined
                            : (executor ?? undefined)
                }
            );
        }, 2500);
    }
}

export default GuildMemberUpdateEventListener;
