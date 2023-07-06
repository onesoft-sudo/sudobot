import { ChannelType, ClientEvents, Message, MessageType } from "discord.js";
import Client from "../../core/Client";
import Event from "../../core/Event";

export default class MessageCreateEvent extends Event {
    public name: keyof ClientEvents = 'messageCreate';

    public types = [
        MessageType.Default,
        MessageType.Reply,
    ]

    constructor(protected client: Client) {
        super(client);
    }

    async execute(message: Message) {
        if (message.author.bot)
            return;

        if (!this.types.includes(message.type))
            return;

        if (message.channel.type === ChannelType.DM)
            return;

        const value = await this.client.commandManager.runCommandFromMessage(message).catch(console.error);

        if (!value) {
            console.log("Command not found");
        }
    }
}