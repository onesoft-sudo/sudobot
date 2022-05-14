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
            var user = await getUser(cm.args[0], msg, false);

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

        const argFirst = cm.args.slice(0, 3);

        const banOptions = {};

        console.log(argFirst);

        const pos = argFirst.indexOf('-d');
        let length = argFirst.length;
        
        if (pos !== -1) {
            const days = argFirst[pos + 1];

            if (days === undefined || !parseInt(days)) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription(`Option \`-d\` requires a valid numeric argument.`)
                    ]
                });
    
                return;
            }

            if (days < 0 || days > 7) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription(`Days must be in range 0-7.`)
                    ]
                });
    
                return;
            }

            banOptions.days = parseInt(days);
            argFirst.splice(1, 2);
        }
        else {
            length = 1;
        }

        const args1 = [...cm.args];
        args1.splice(0, length);
        const reason = args1.join(' ');

        if (reason.trim() !== '') {
            banOptions.reason = reason;
        }

        console.log(argFirst, banOptions);

        try {
            if (typeof user.bannable === 'boolean' && user.bannable === false) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription(`This user isn't bannable.`)
                    ]
                });
                
                return;
            }

            await History.create(user.id, msg.guild, 'ban', msg.author.id, typeof banOptions.reason === 'undefined' ? null : banOptions.reason, async (data2) => {
                await msg.guild.bans.create(user.id, banOptions);
            });
        }
        catch(e) {
            console.log(e);

            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`I don't have enough permission to ban this user.`)
                ]
            });

            return;
        }

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setDescription(`The user ${user.tag} has been banned`)
                .addFields([
                    {
                        name: "Reason",
                        value: typeof banOptions.reason === 'undefined' ? '*No reason provided*' : banOptions.reason
                    }
                ])
            ]
        });
    }
};