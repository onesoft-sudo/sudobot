import BaseEvent from '../../utils/structures/BaseEvent';
import { FileOptions, Message } from 'discord.js';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import path from 'path';
import MessageEmbed from '../../client/MessageEmbed';

export default class MessageDeleteEvent extends BaseEvent {
    constructor() {
        super('messageDelete');
    }

    async run(client: DiscordClient, message: Message) {
        if (message.author.bot || !message.guild || message.channel.type === 'DM')
            return;

        await client.logger.logDelete(message);
    }
}