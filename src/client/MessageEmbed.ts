import { MessageEmbed as MessageEmbedDiscord, MessageEmbedOptions } from 'discord.js';

export default class MessageEmbed extends MessageEmbedDiscord {
    constructor(options?: MessageEmbedDiscord | MessageEmbedOptions) {
        super(options);
        this.setColor('#007bff');
    }
}