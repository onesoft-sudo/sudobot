import { Inject } from "@framework/container/Inject";
import EventListener from "@framework/events/EventListener";
import { Events } from "@framework/types/ClientEvents";
import { Message } from "discord.js";
import type CountingService from "../../services/CountingService";

class MessageCreateEventListener extends EventListener {
    public override readonly name = Events.MessageCreate;

    @Inject("countingService")
    private readonly countingService!: CountingService;

    public override async execute(message: Message<boolean>) {
        if (!message.inGuild() || message.author.bot) {
            return;
        }

        await this.countingService.onMessageCreate(message);
    }
}

export default MessageCreateEventListener;
