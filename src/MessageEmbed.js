const { MessageEmbed: MessageEmbedDiscord } = require('discord.js');

class MessageEmbed extends MessageEmbedDiscord {
    constructor() {
        super();
        this.setColor('#007bff');
    }
}

module.exports = MessageEmbed;