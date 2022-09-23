import BaseEvent from '../../utils/structures/BaseEvent';
import { Message } from 'discord.js';
import DiscordClient from '../../client/Client';

export default class MessageDeleteEvent extends BaseEvent {
    constructor() {
        super('messageDelete');
    }

    async run(client: DiscordClient, message: Message) {
        if (message.author.bot || !message.guild || message.channel.type === 'DM' || (global as any).deletingMessages === true)
            return;

        await client.logger.logDelete(message);
    }
}