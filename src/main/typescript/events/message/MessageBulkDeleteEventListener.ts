import { Inject } from "@framework/container/Inject";
import EventListener from "@framework/events/EventListener";
import { Events } from "@framework/types/ClientEvents";
import type AuditLoggingService from "@main/services/AuditLoggingService";
import { LogEventType } from "@main/types/LoggingSchema";
import type { Collection, GuildTextBasedChannel, Message, PartialMessage } from "discord.js";

class MessageBulkDeleteEventListener extends EventListener<Events.MessageDeleteBulk> {
    public override readonly name = Events.MessageDeleteBulk;

    @Inject("auditLoggingService")
    protected readonly auditLoggingService!: AuditLoggingService;

    public override async execute(
        messages: Collection<string, Message<boolean> | PartialMessage>,
        channel: GuildTextBasedChannel
    ): Promise<void> {
        await this.auditLoggingService.emitLogEvent(
            channel.guildId,
            LogEventType.MessageDeleteBulk,
            messages,
            channel
        );
    }
}

export default MessageBulkDeleteEventListener;
