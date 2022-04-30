const { Permissions } = require("discord.js");
const MessageEmbed = require("../src/MessageEmbed");

module.exports = {
    needsOptionParse: true,
    async handle(msg, cm) {
        let channels = app.config.get('lockall');

        if (msg.mentions.channels.first()) {
            channels = msg.mentions.channels;
        }
        else {
            channels = await msg.guild.channels.cache.filter(c => channels.indexOf(c.id) !== -1);
        }
        
        let role = cm.options.indexOf('--everyone') === -1 ? msg.guild.roles.cache.find(r => r.id === app.config.get('gen_role')) : msg.guild.roles.everyone;

        await this.lockAll(role, channels, cm.options.indexOf('--no-send') === -1);
    },
    async lockAll(role, channels, send) {
        if (role) {
            channels.forEach(async channel => {
                if (send) {
                    channel.send({
                        embeds: [
                            new MessageEmbed()
                            .setDescription(':lock: This channel has been locked.')
                        ]
                    });
                }
                
                channel.permissionOverwrites.edit(role, {
                    SEND_MESSAGES: false,
                });
            });
        }
    }
};