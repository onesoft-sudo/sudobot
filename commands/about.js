const MessageEmbed = require('../src/MessageEmbed');
const { version } = require('./help');

module.exports = {
    async handle(msg) {
        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setTitle('SudoBot')
                .setDescription('A free and open source discord moderation bot, specially created for **The Everything Server**.')
                .addField('Version', version)
                .addField('Support', 'rakinar2@onesoftnet.ml')
                .setFooter({
                    text: 'Copyright © Ar Rakin 2022, all rights reserved'
                })
            ]
        });
    }
};