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
            await setTimeoutv2('send.js', time, text, ch.id, msg.guild.id);
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