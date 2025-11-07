import { Inject } from "@framework/container/Inject";
import EventListener from "@framework/events/EventListener";
import { Events } from "@framework/types/ClientEvents";
import CommandManagerService from "@main/services/CommandManagerService";
import { OmitPartialGroupDMChannel, Message, Awaitable, MessageType } from "discord.js";

class MessageCreateEventListener extends EventListener<Events.MessageCreate> {
    public override readonly type = Events.MessageCreate;

    private readonly supportedTypes = [MessageType.Default, MessageType.Reply, MessageType.ThreadStarterMessage];

    @Inject()
    private readonly commandManagerService!: CommandManagerService;

    public override onEvent(message: OmitPartialGroupDMChannel<Message<boolean>>): Awaitable<void> {
        if (message.author.bot || !this.supportedTypes.includes(message.type)) {
            return;
        }

        this.commandManagerService.run(message).catch(this.application.logger.error);
    }
}

export default MessageCreateEventListener;
