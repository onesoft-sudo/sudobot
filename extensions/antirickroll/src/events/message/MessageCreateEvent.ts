import EventListener from "@sudobot/core/EventListener";
import { Events } from "@sudobot/types/ClientEvents";
import { Message } from "discord.js";
import type AntiRickRollService from "../../services/AntiRickRollService";

export default class MessageCreateEvent extends EventListener<Events.MessageCreate> {
    public readonly name = Events.MessageCreate;

    async execute(message: Message) {
        if (message.author.bot) {
            return;
        }

        this.client.getService<AntiRickRollService>("antiRickRollService").scanMessage(message);
    }
}
