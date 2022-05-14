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

        let reason = {};

        if (typeof cm.args[1] !== 'undefined') {
            let args = [...cm.args];
            args.shift();

            await (reason.reason = args.join(' '));
        }

        try {
            if (typeof user.kickable === 'boolean' && user.kickable === false) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription(`This user isn't kickable.`)
                    ]
                });
                
                return;
            }

            
            await History.create(user.id, msg.guild, 'kick', msg.author.id, typeof reason.reason === 'undefined' ? null : reason.reason, async (data2) => {
                await user.kick(reason);
            });
        }
        catch(e) {
            console.log(e);

            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`I don't have enough permission to kick this user.`)
                ]
            });

            return;
        }

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setDescription(`The user ${user.user.tag} has been kicked`)
                .addFields([
                    {
                        name: "Reason",
                        value: typeof reason.reason === 'undefined' ? '*No reason provided*' : reason.reason
                    }
                ])
            ]
        });
    }
};