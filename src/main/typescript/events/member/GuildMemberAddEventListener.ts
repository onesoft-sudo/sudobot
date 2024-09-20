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
import type AntiMemberJoinService from "@main/automod/AntiMemberJoinService";
import { LogEventType } from "@main/schemas/LoggingSchema";
import type AuditLoggingService from "@main/services/AuditLoggingService";
import type InfractionManager from "@main/services/InfractionManager";
import type { GuildMember } from "discord.js";

class GuildMemberAddEventListener extends EventListener<Events.GuildMemberAdd> {
    public override readonly name = Events.GuildMemberAdd;

    @Inject("auditLoggingService")
    protected readonly auditLoggingService!: AuditLoggingService;

    @Inject("infractionManager")
    protected readonly infractionManager!: InfractionManager;

    @Inject("antiMemberJoinService")
    protected readonly antiMemberJoinService!: AntiMemberJoinService;

    public override async execute(member: GuildMember): Promise<void> {
        this.auditLoggingService
            .emitLogEvent(member.guild.id, LogEventType.GuildMemberAdd, member)
            .catch(this.application.logger.error);
        await this.antiMemberJoinService.onGuildMemberAdd(member);
        this.infractionManager.reapplyMuteIfNeeded(member).catch(this.application.logger.error);
    }
}

export default GuildMemberAddEventListener;
