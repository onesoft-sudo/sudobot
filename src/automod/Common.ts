import { Message } from "discord.js";
import Service from "../utils/structures/Service";

export default class Common extends Service {
    words: string[] = [];

    async run(message: Message) {
        this.words = message.content.toLowerCase().split(/\s+/);
    }
}