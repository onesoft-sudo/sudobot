import { Inject } from "@framework/container/Inject";
import EventListener from "@framework/events/EventListener";
import type AIAutoModeration from "@main/automod/AIAutoModeration";
import type RuleModerationService from "@main/automod/RuleModerationService";
import { LogEventType } from "@main/schemas/LoggingSchema";
import type AuditLoggingService from "@main/services/AuditLoggingService";
import { Events, Message } from "discord.js";

class MessageUpdateEventListener extends EventListener<Events.MessageUpdate> {
    public override readonly name = Events.MessageUpdate;

    @Inject("auditLoggingService")
    protected readonly auditLoggingService!: AuditLoggingService;

    @Inject("ruleModerationService")
    private readonly ruleModerationService!: RuleModerationService;

    @Inject("aiAutoModeration")
    private readonly aiAutoModeration!: AIAutoModeration;

    public override async execute(oldMessage: Message, newMessage: Message) {
        if (
            newMessage.author.bot ||
            newMessage.webhookId ||
            !newMessage.inGuild() ||
            newMessage.content === oldMessage.content
        ) {
            return;
        }

        this.auditLoggingService.emitLogEvent(
            newMessage.guildId!,
            LogEventType.MessageUpdate,
            oldMessage as Message<true>,
            newMessage as Message<true>
        );

        if (
            oldMessage.content !== newMessage.content ||
            oldMessage.embeds.length !== newMessage.embeds.length
        ) {
            await this.ruleModerationService.onMessageCreate(newMessage);
        }

        await this.aiAutoModeration.onMessageUpdate(oldMessage, newMessage);
    }
}

export default MessageUpdateEventListener;
