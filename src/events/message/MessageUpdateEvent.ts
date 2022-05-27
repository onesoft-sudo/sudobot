import BaseEvent from '../../utils/structures/BaseEvent';
import { FileOptions, Message } from 'discord.js';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import path from 'path';
import MessageEmbed from '../../client/MessageEmbed';

export default class MessageUpdateEvent extends BaseEvent {
    constructor() {
        super('messageUpdate');
    }

    async run(client: DiscordClient, oldMessage: Message, newMessage: Message) {
        if (oldMessage.author.bot || !oldMessage.guild || oldMessage.channel.type === 'DM' || oldMessage.content === newMessage.content)
            return;

        let msg = await client.msg;
        await (client.msg = newMessage);
    
        await client.messageFilter.start(newMessage);
        // await client.messageFilter.start(newMessage, this.commandManager);

        await client.logger.logEdit(oldMessage, newMessage);
        await (client.msg = msg);
    }
}