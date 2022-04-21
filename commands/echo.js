const MessageEmbed = require("../src/MessageEmbed");

module.exports = {
    async handle(msg, cm) {
        if (typeof cm.args[0] === 'undefined') {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires at least one argument.`)
                ]
            });

            return;
        }

        var ch = await msg.mentions?.channels?.first();
        let text;
        let args = [...cm.args];


        if (typeof ch !== 'object' || ch === null) {
            ch = msg.channel;
        }
        else {
            args.pop();
        }

        text = args.join(' ');

        try {
            await ch.send({
                content: text
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

        await msg.react('✅');
    }
};