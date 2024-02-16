import EventListener from "@sudobot/core/EventListener";
import { Events } from "@sudobot/types/ClientEvents";
import { Message } from "discord.js";
import type URLFishService from "../../services/URLFishService";

export default class NormalMessageCreateEventListener extends EventListener<Events.NormalMessageCreate> {
    public readonly name = Events.NormalMessageCreate;

    async execute(message: Message) {
        const urlfishService = this.client.getService<URLFishService>("urlfish");
        urlfishService.verifyMessage(message);
    }
}
