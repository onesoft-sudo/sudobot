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
import type AuditLoggingService from "@main/services/AuditLoggingService";
import { LogEventType } from "@schemas/LoggingSchema";
import { VoiceState } from "discord.js";

class VoiceStateUpdateEventListener extends EventListener<Events.VoiceStateUpdate> {
    public override readonly name = Events.VoiceStateUpdate;

    @Inject("auditLoggingService")
    protected readonly auditLoggingService!: AuditLoggingService;

    public override async execute(oldState: VoiceState, newState: VoiceState): Promise<void> {
        if (oldState.channelId === newState.channelId) {
            return;
        }

        const member = newState.member ?? oldState.member;

        if (!member || member.id === this.application.client.user?.id) {
            return;
        }

        if (!oldState.channel && newState.channel) {
            await this.auditLoggingService.emitLogEvent(
                member.guild.id,
                LogEventType.MemberVoiceChannelJoin,
                member, newState.channel, newState
            );
        }
        else if (oldState.channel && !newState.channel) {
            await this.auditLoggingService.emitLogEvent(
                member.guild.id,
                LogEventType.MemberVoiceChannelLeave,
                member, oldState.channel, newState
            );
        }
    }
}

export default VoiceStateUpdateEventListener;
