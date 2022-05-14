const History = require("../src/History");
const MessageEmbed = require("../src/MessageEmbed");
const { getUser } = require("../src/UserInput");

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

        try {
            var user = await getUser(cm.args[0], msg);

            console.log(user);

            if (!user) {
                throw new Error('Invalid User');
            }
        }
        catch (e) {
            console.log(e);

            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`Invalid user given.`)
                ]
            });

            return;
        }

        let reason;

        if (typeof cm.args[1] !== 'undefined') {
            let args = [...cm.args];
            args.shift();

            await (reason = args.join(' '));
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