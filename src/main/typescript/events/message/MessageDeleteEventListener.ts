import { Inject } from "@framework/container/Inject";
import EventListener from "@framework/events/EventListener";
import { fetchUser } from "@framework/utils/entities";
import AuditLoggingService from "@main/services/AuditLoggingService";
import { LogEventType } from "@main/types/LoggingSchema";
import { AuditLogEvent, Events, Message, Snowflake } from "discord.js";

class MessageDeleteEventListener extends EventListener<Events.MessageDelete> {
    public override readonly name = Events.MessageDelete;
    private readonly deleteCountMap = new Map<Snowflake, number>();

    @Inject("auditLoggingService")
    protected readonly auditLoggingService!: AuditLoggingService;

    private async findResponsibleModerator(message: Message) {
        const auditLogs = await message.guild!.fetchAuditLogs({
            type: AuditLogEvent.MessageDelete,
            limit: 10
        });

        const log = auditLogs.entries.find(entry => {
            if (
                !(
                    entry.targetId === message.author.id &&
                    entry.actionType === "Delete" &&
                    entry.extra.channel.id === message.channelId &&
                    entry.createdTimestamp > Date.now() - 5000 &&
                    entry.executorId
                )
            ) {
                return false;
            }

            const prevCount = this.deleteCountMap.get(entry.executorId) ?? 0;
            const result = prevCount + 1 === entry.extra.count;
            this.deleteCountMap.set(entry.executorId, entry.extra.count);
            return result;
        });

        if (log && (log.executorId || log.executor)) {
            return log.executor ?? (await fetchUser(this.client, log.executorId!)) ?? undefined;
        }

        return undefined;
    }

    public override async execute(message: Message) {
        if (message.author.bot || message.webhookId || !message.inGuild()) {
            return;
        }

        setTimeout(async () => {
            const moderator = await this.findResponsibleModerator(message);

            this.auditLoggingService.emitLogEvent(
                message.guildId!,
                LogEventType.MessageDelete,
                message,
                moderator
            );
        }, 1000);
    }
}

export default MessageDeleteEventListener;
