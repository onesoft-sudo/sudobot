const History = require("../src/History");
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

        var user = await msg.mentions.members.first();
        let reason;

        if (typeof cm.args[1] !== 'undefined') {
            let args = [...cm.args];
            args.shift();

            await (reason = args.join(' '));
        }

        if (typeof user !== 'object') {
            try {
                user = await msg.guild.members.fetch(cm.args[0]);
            }
            catch(e) {

            }
        }

        if (typeof user !== 'object') {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`Invalid user given.`)
                ]
            });

            return;
        }

        this.bean(user, reason, msg);

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setDescription(`The user ${user.user.tag} has been beaned`)
                .addFields([
                    {
                        name: "Reason",
                        value: typeof reason === 'undefined' ? '*No reason provided*' : reason
                    }
                ])
            ]
        });
    },
    async bean(user, reason, msg) {
        await History.create(user.id, msg.guild, 'bean', msg.author.id, typeof reason === 'undefined' ? null : reason, async (data2) => {
            await user.send({
                embeds: [
                    new MessageEmbed()
                    .setAuthor({
                        iconURL: msg.guild.iconURL(),
                        name: `\tYou have been beaned in ${msg.guild.name}`
                    })
                    .addFields([
                        {
                            name: "Reason",
                            value: typeof reason === 'undefined' ? '*No reason provided*' : reason
                        }
                    ])
                ]
            });

            await app.logger.logBeaned(user, typeof reason === 'undefined' ? '*No reason provided*' : reason, msg.author);
        });
    }
};