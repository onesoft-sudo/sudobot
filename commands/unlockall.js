const { Permissions } = require("discord.js");
const MessageEmbed = require("../src/MessageEmbed");

module.exports = {
    needsOptionParse: true,
    async handle(msg, cm) {
        let channels = cm.options.indexOf('--raid') !== -1 ? app.config.get('raid').excluded : app.config.get('lockall');

        if (msg.mentions.channels.first()) {
            channels = msg.mentions.channels;
        }
        else {
            channels = await msg.guild.channels.cache.filter(c => ((cm.options.indexOf('--raid') !== -1 && channels.indexOf(c.id) === -1 && channels.indexOf(c.parent?.id) === -1 && c.type === 'GUILD_TEXT') || (cm.options.indexOf('--raid') === -1 && channels.indexOf(c.id) !== -1)));
        }

        await this.unlockAll(msg, cm, channels);
    },
    async unlockAll(msg, cm, channels) {
        let role = cm.options.indexOf('--everyone') === -1 ? msg.guild.roles.cache.find(r => r.id === app.config.get('gen_role')) : msg.guild.roles.everyone;

        if (role) {
            channels.forEach(async channel => {
                try {
                    if (cm.options.indexOf('--no-send') === -1) {
                        channel.send({
                            embeds: [
                                new MessageEmbed()
                                .setDescription(':closed_lock_with_key: This channel has been unlocked.')
                            ]
                        });
                    }
                    
                    channel.permissionOverwrites.edit(role, {
                        SEND_MESSAGES: true,
                    });
                }
                catch(e) {
                    console.log(e);
                }
            });
        }
    }
};