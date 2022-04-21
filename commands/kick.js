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
        let reason = {};

        if (typeof cm.args[1] !== 'undefined') {
            let args = [...cm.args];
            args.shift();

            await (reason.reason = args.join(' '));
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

            await user.kick(reason);
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