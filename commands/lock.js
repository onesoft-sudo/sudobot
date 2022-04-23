const { Permissions } = require("discord.js");
const MessageEmbed = require("../src/MessageEmbed");

module.exports = {
    needsOptionParse: true,
    async handle(msg, cm) {
        let channel;

        if (typeof cm.normalArgs[0] === 'undefined') {
            channel = msg.channel;
        }

        let role = cm.options.indexOf('--everyone') === -1 ? msg.guild.roles.cache.find(r => r.id === app.config.get('gen_role')) : msg.guild.roles.everyone;

        if (role) {
            if (!channel) {
                channel = msg.mentions?.channels?.first();

                if (!channel) {
                    channel = msg.guild.channels.cache.find(c => c.id === cm.normalArgs[0]);
                }
            }

            if (channel) {
                if (cm.options.indexOf('--no-send') === -1) {
                    channel.send({
                        embeds: [
                            new MessageEmbed()
                            .setDescription('This channel has been locked.')
                        ]
                    });
                }
                
                channel.permissionOverwrites.edit(role, {
                    SEND_MESSAGES: false,
                });
            }
            else {
                console.log('invalid channel');
            }
        }        

        // await msg.reply({
        //     embeds: [
        //         new MessageEmbed()
        //         .setDescription(`The user ${user.user.tag} has been beaned`)
        //         .addFields([
        //             {
        //                 name: "Reason",
        //                 value: typeof reason === 'undefined' ? '*No reason provided*' : reason
        //             }
        //         ])
        //     ]
        // });
    }
};