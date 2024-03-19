import { Message, MessageType } from "discord.js";
import { Inject } from "../../framework/container/Inject";
import EventListener from "../../framework/events/EventListener";
import { Events } from "../../framework/types/ClientEvents";
import CommandManager from "../../services/CommandManager";
import { safeMemberFetch } from "../../utils/fetch";

class MessageCreateEventListener extends EventListener<Events.MessageCreate> {
    public override readonly name = Events.MessageCreate;
    protected readonly types = [MessageType.Default, MessageType.Reply];

    @Inject()
    protected readonly commandManager!: CommandManager;

    public override async execute(message: Message<boolean>) {
        if (message.author.bot || !message.inGuild() || !this.types.includes(message.type)) {
            return;
        }

        if (!message.member) {
            Reflect.set(message, "member", await safeMemberFetch(message.guild, message.author.id));
        }

        const value = await this.commandManager.runCommandFromMessage(message);

        if (value === false) {
            this.client.logger.debug("Command or snippet not found: all strategies failed");
        }
    }
}

export default MessageCreateEventListener;
