import { Inject } from "@framework/container/Inject";
import EventListener from "@framework/events/EventListener";
import AuditLoggingService, { LogEventType } from "@main/services/AuditLoggingService";
import { Events, Message } from "discord.js";

class MessageUpdateEventListener extends EventListener<Events.MessageUpdate> {
    public override readonly name = Events.MessageUpdate;

    @Inject("auditLoggingService")
    protected readonly auditLoggingService!: AuditLoggingService;

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
    }
}

export default MessageUpdateEventListener;
