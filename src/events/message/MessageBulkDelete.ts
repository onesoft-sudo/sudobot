import { Collection, Message } from "discord.js";
import DiscordClient from "../../client/Client";
import BaseEvent from "../../utils/structures/BaseEvent";

export default class MessageBulkDeleteEvent extends BaseEvent {
    constructor() {
        super('messageDeleteBulk');
    }

    async run(client: DiscordClient, messages: Collection<string, Message>) {
        if (!messages.at(0)?.guild || messages.at(0)?.channel.type === 'DM') {
            return;
        }

        await client.logger.onBulkDelete(messages);
    }
}