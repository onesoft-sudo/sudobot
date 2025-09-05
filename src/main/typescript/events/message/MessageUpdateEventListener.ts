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
import type AIAutoModeration from "@main/automod/AIAutoModeration";
import EarlyMessageInspectionService from "@main/automod/EarlyMessageInspectionService";
import type RuleModerationService from "@main/automod/RuleModerationService";
import { LogEventType } from "@main/schemas/LoggingSchema";
import type AuditLoggingService from "@main/services/AuditLoggingService";
import { Events, Message, OmitPartialGroupDMChannel, PartialMessage } from "discord.js";

class MessageUpdateEventListener extends EventListener<Events.MessageUpdate> {
    public override readonly name = Events.MessageUpdate;

    @Inject("auditLoggingService")
    protected readonly auditLoggingService!: AuditLoggingService;

    @Inject("ruleModerationService")
    private readonly ruleModerationService!: RuleModerationService;

    @Inject("aiAutoModeration")
    private readonly aiAutoModeration!: AIAutoModeration;

    @Inject("earlyMessageInspectionService")
    private readonly earlyMessageInspectionService!: EarlyMessageInspectionService;

    public override async execute(
        oldMessage: OmitPartialGroupDMChannel<Message | PartialMessage>,
        newMessage: OmitPartialGroupDMChannel<Message>
    ) {
        if (
            newMessage.author.bot ||
            newMessage.webhookId ||
            !newMessage.inGuild() ||
            newMessage.content === oldMessage.content
        ) {
            return;
        }

        this.auditLoggingService
            .emitLogEvent(newMessage.guildId, LogEventType.MessageUpdate, oldMessage as Message<true>, newMessage)
            .catch(this.application.logger.error);

        if (oldMessage.content !== newMessage.content || oldMessage.embeds.length !== newMessage.embeds.length) {
            await this.ruleModerationService.onMessageCreate(newMessage);
            await this.earlyMessageInspectionService.onMessageUpdate(oldMessage, newMessage);
        }

        await this.aiAutoModeration.onMessageUpdate(oldMessage, newMessage);
    }
}

export default MessageUpdateEventListener;
