import { ClientEvents } from "discord.js";
import Client from "./Client";

export default abstract class Event<K extends keyof ClientEvents = keyof ClientEvents> {
    public abstract readonly name: K;

    constructor(protected client: Client) { }

    abstract execute(...args: ClientEvents[K]): Promise<any>;
}