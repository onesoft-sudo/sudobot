import { Inject } from "@framework/container/Inject";
import EventListener from "@framework/events/EventListener";
import { NonPartialGroupDMChannel } from "@framework/types/ClientEvents";
import { fetchUser } from "@framework/utils/entities";
import { LogEventType } from "@main/schemas/LoggingSchema";
import type AuditLoggingService from "@main/services/AuditLoggingService";
import { AuditLogEvent, Events, Message, PartialMessage, Snowflake } from "discord.js";

class MessageDeleteEventListener extends EventListener<Events.MessageDelete> {
    public override readonly name = Events.MessageDelete;
    private readonly deleteCountMap = new Map<`${Snowflake}_${Snowflake}`, number>();

    @Inject("auditLoggingService")
    protected readonly auditLoggingService!: AuditLoggingService;

    public override onInitialize(): void {
        setInterval(() => this.deleteCountMap.clear(), 1_000 * 60 * 6);
    }

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

            const prevCount =
                this.deleteCountMap.get(`${message.guildId!}_${entry.executorId}`) ?? 0;
            const result = prevCount + 1 === entry.extra.count;
            this.deleteCountMap.set(`${message.guildId!}_${entry.executorId}`, entry.extra.count);
            return result;
        });

        if (log && (log.executorId || log.executor)) {
            return log.executor ?? (await fetchUser(this.client, log.executorId!)) ?? undefined;
        }

        return undefined;
    }

    public override async execute(message: NonPartialGroupDMChannel<Message | PartialMessage>) {
        if (message.partial) {
            try {
                await message.fetch();
            } catch (error) {
                this.application.logger.error(
                    "Failed to fetch message in MessageDeleteEventListener",
                    error
                );
                return;
            }
        }

        if (message.author?.bot || message.webhookId || !message.inGuild()) {
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
        }, 100);
    }
}

export default MessageDeleteEventListener;
