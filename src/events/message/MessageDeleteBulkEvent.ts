import {
    AuditLogEvent,
    ClientEvents,
    Collection,
    GuildTextBasedChannel,
    Message,
    PartialMessage,
    Snowflake,
    TextChannel
} from "discord.js";
import EventListener from "../../core/EventListener";
import { logError } from "../../utils/logger";

export default class MessageDeleteBulkEvent extends EventListener {
    public readonly name: keyof ClientEvents = "messageDeleteBulk";

    async execute(messages: Collection<Snowflake, Message | PartialMessage>, channel: GuildTextBasedChannel) {
        super.execute(messages, channel);

        setTimeout(async () => {
            try {
                const auditLog = (
                    await channel.guild.fetchAuditLogs({
                        limit: 1,
                        type: AuditLogEvent.MessageBulkDelete
                    })
                ).entries.first();

                if (auditLog?.executor?.id && auditLog.executor.id !== this.client.user?.id) {
                    await this.client.infractionManager.bulkDeleteMessages({
                        logOnly: true,
                        sendLog: true,
                        guild: channel.guild,
                        moderator: auditLog.executor,
                        messageChannel: channel as TextChannel,
                        messagesToDelete: [...messages.values()] as Message[]
                    });
                }
            } catch (e) {
                logError(e);
            }
        }, 2000);
    }
}
