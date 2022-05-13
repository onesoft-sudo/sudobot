const { MessageEmbed } = require("discord.js");
const ms = require("ms");
const { clearTimeoutv2, getTimeout, setTimeoutv2 } = require("../src/setTimeout");
const { timeSince } = require("../src/util");

module.exports = {
    async handle(msg, cm) {
        if (cm.args[1] === undefined) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires at least two arguments.`)
                ]
            });

            return;
        }

        const time = await ms(cm.args[0]);

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

        const args = [...cm.args];
        args.shift();

        if (typeof cm.commands[args[0]] === 'undefined') {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`Invalid command given.`)
                ]
            });

            return;
        }

        const command = await args.join(' ');

        const queue = await setTimeoutv2('queue.js', time, command, msg.id, msg.channel.id, msg.guild.id);

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setColor('#007bff')
                .setDescription(`The queue has been added.`)
                .setFields([
                    {
                        name: "ID",
                        value: queue.row.id + '',
                    },
                    {
                        name: "Command",
                        value: `\`${command}\``
                    },
                    {
                        name: "Time",
                        value: "After " + timeSince(Date.now() - time).replace(' ago', '')
                    }
                ])
            ]
        });
    }
};