import EventListener from "@sudobot/core/EventListener";
import { Events } from "@sudobot/types/ClientEvents";
import { Message } from "discord.js";
import type AntiRickRollService from "../../services/AntiRickRollService";

export default class MessageUpdateEvent extends EventListener<Events.MessageUpdate> {
    public readonly name = Events.MessageUpdate;

    async execute(oldMessage: Message, newMessage: Message) {
        if (newMessage.author.bot || oldMessage.content === newMessage.content) {
            return;
        }

        this.client.getService<AntiRickRollService>("antiRickRollService").scanMessage(newMessage);
    }
}
