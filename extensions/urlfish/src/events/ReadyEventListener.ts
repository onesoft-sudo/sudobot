import EventListener from "@sudobot/core/EventListener";
import { Events } from "@sudobot/types/ClientEvents";
import type URLFishService from "../services/URLFishService";

export default class ReadyEventListener extends EventListener<Events.Ready> {
    public readonly name = Events.Ready;

    async execute() {
        const service = this.client.getService<URLFishService>("urlfish");
    }
}
