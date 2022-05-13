const MessageEmbed = require("../src/MessageEmbed");
const { setTimeoutv2 } = require("../src/setTimeout");
const path = require('path');
const ms = require("ms");

module.exports = {
    async handle(msg, cm) {
        if (typeof cm.args[1] === 'undefined') {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires at least two arguments.`)
                ]
            });

            return;
        }

        const time = ms(cm.args[0]);

        if (!time) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`Invalid time interval given.`)
                ]
            });

            return;
        }   

        var ch = await msg.mentions?.channels?.last();
        let text;
        let args = [...cm.args];
        args.shift();

        if (typeof ch !== 'object' || ch === null) {
            ch = msg.channel;
        }
        else {
            args.pop();
        }

        text = args.join(' ');

        try {
            const message = await ch.send({
                content: text
            });

            const timeout = await setTimeoutv2('expire.js', time, message.id, ch.id, msg.guild.id);

            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setDescription('A queue job has been added.')
                    .setFooter({
                        text: 'ID: ' + timeout.row.id
                    })
                ]
            });
        }
        catch(e) {
            console.log(e);

            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`I don't have enough permission to send messages on this channel.`)
                ]
            });

            return;
        }

        await msg.react('⏰');
    }
};