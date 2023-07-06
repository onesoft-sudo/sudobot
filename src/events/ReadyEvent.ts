import { ClientEvents } from "discord.js";
import Event from "../core/Event";

export default class ReadyEvent extends Event {
    public name: keyof ClientEvents = 'ready';

    async execute() {
        console.log("The bot has logged in.");
    }
}