import EventListener from "@sudobot/core/EventListener";
import { Events } from "@sudobot/types/ClientEvents";
import type URLFishService from "../../services/URLFishService";
import { Message } from "discord.js";

export default class NormalMessageCreateEventListener extends EventListener<Events.NormalMessageCreate> {
    public readonly name = Events.NormalMessageCreate;

    async execute(message: Message) {
        const urlfishService = this.client.getService<URLFishService>("urlfish");
        const links = urlfishService.scanMessage(message);

        if (links.length > 0) {
            await message.delete();
        }
    }
}
