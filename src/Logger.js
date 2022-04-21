const { MessageEmbed } = require('discord.js');

class Logger {
    constructor() {
        
    }

    channel(callback, msg) {
        let channelID = app.config.get('logging_channel');
        let channel = msg.guild.channels.cache.find(c => c.id === channelID);

        if (channel) {
            return callback(channel);
        }
    }

    logEdit(oldMsg, newMsg) {
        this.channel(async (channel) => {
            await channel.send({
                embeds: [
                    new MessageEmbed()
                    .setColor('#007bff')
                    .setTitle('Message Edited in #' + newMsg.channel.name + " (" + newMsg.channel.id + ")")
                    .addField('Before', oldMsg.content)
                    .addField('After', newMsg.content)
                    .addField('ID', newMsg.id)
                    .setAuthor({
                        name: newMsg.author.tag,
                        iconURL: newMsg.author.displayAvatarURL(),
                    })
                    .setFooter({
                        text: "Edited",
                    })
                    .setTimestamp()
                ]
            });
        }, newMsg);
    }

    logDelete(msg) {
        this.channel(async (channel) => {
            await channel.send({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setTitle('Message Deleted in #' + msg.channel.name + " (" + msg.channel.id + ")")
                    .setDescription(msg.content)
                    .setAuthor({
                        name: msg.author.tag,
                        iconURL: msg.author.displayAvatarURL(),
                    })
                    .addField('ID', msg.id)
                    .setFooter({
                        text: "Deleted",
                    })
                    .setTimestamp()
                ]
            });
        }, msg);
    }
}

module.exports = Logger;