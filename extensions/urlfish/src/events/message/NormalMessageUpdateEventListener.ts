import EventListener from "@sudobot/core/EventListener";
import { Events } from "@sudobot/types/ClientEvents";
import type URLFishService from "../../services/URLFishService";
import { Message } from "discord.js";

export default class NormalMessageUpdateEventListener extends EventListener<Events.NormalMessageUpdate> {
    public readonly name = Events.NormalMessageUpdate;

    async execute(oldMessage: Message, newMessage: Message) {
        const urlfishService = this.client.getService<URLFishService>("urlfish");
        const links = urlfishService.scanMessage(newMessage);

        if (links.length > 0) {
            await newMessage.delete();
        }
    }
}
