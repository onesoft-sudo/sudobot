import EventListener from "@sudobot/core/EventListener";
import { Events } from "@sudobot/types/ClientEvents";
import { Message } from "discord.js";
import type URLFishService from "../../services/URLFishService";

export default class NormalMessageUpdateEventListener extends EventListener<Events.NormalMessageUpdate> {
    public readonly name = Events.NormalMessageUpdate;

    async execute(oldMessage: Message, newMessage: Message) {
        const urlfishService = this.client.getService<URLFishService>("urlfish");
        urlfishService.verifyMessage(newMessage);
    }
}
