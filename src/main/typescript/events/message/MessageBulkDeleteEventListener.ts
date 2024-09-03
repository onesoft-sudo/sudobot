import { Inject } from "@framework/container/Inject";
import EventListener from "@framework/events/EventListener";
import { Events } from "@framework/types/ClientEvents";
import { fetchUser } from "@framework/utils/entities";
import { LogEventType } from "@main/schemas/LoggingSchema";
import type AuditLoggingService from "@main/services/AuditLoggingService";
import {
    AuditLogEvent,
    ReadonlyCollection,
    type GuildTextBasedChannel,
    type Message,
    type PartialMessage
} from "discord.js";

class MessageBulkDeleteEventListener extends EventListener<Events.MessageDeleteBulk> {
    public override readonly name = Events.MessageDeleteBulk;

    @Inject("auditLoggingService")
    protected readonly auditLoggingService!: AuditLoggingService;

    public override execute(
        messages: ReadonlyCollection<string, Message<boolean> | PartialMessage>,
        channel: GuildTextBasedChannel
    ): void {
        setTimeout(async () => {
            const logs = await channel.guild.fetchAuditLogs({
                type: AuditLogEvent.MessageBulkDelete,
                limit: 10
            });

            const log = logs.entries.find(
                entry =>
                    entry.target?.id === channel.id && Date.now() - entry.createdTimestamp < 2200
            );

            const executorId = log?.executor?.id ?? log?.executorId;

            if (executorId && executorId === this.client.user?.id) {
                return;
            }

            await this.auditLoggingService.emitLogEvent(
                channel.guildId,
                LogEventType.MessageDeleteBulk,
                {
                    messages,
                    channel,
                    moderator:
                        log?.executor ??
                        (executorId
                            ? ((await fetchUser(this.client, executorId)) ?? undefined)
                            : undefined),
                    reason: log?.reason ?? undefined
                }
            );
        }, 1500);
    }
}

export default MessageBulkDeleteEventListener;
