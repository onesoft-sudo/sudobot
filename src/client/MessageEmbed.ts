import { MessageEmbed as MessageEmbedDiscord } from 'discord.js';

export default class MessageEmbed extends MessageEmbedDiscord {
    constructor() {
        super();
        this.setColor('#007bff');
    }
}