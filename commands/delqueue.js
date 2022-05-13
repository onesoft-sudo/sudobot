const { MessageEmbed } = require("discord.js");
const { clearTimeoutv2, getTimeout, getTimeouts } = require("../src/setTimeout");

module.exports = {
    async handle(msg, cm) {
        if (cm.args[0] === undefined) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires at least one argument.`)
                ]
            });

            return;
        }

        const timeout = await getTimeout(parseInt(cm.args[0]));
        console.log(getTimeouts());

        if (!timeout) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`Invalid queue ID given.`)
                ]
            });

            return;
        }

        await clearTimeoutv2(timeout);

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setColor('#f14a60')
                .setDescription(`The queue has been deleted.`)
                .setFooter({
                    text: '' + timeout.row.id
                })
            ]
        });
    }
};