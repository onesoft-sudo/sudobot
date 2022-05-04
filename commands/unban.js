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

        try {
            await msg.guild.bans.remove(cm.args[0]);
        }
        catch(e) {
            console.log(e);

            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`Invalid user ID or missing permissions or user not banned.`)
                ]
            });

            return;
        }
        
        await History.create(cm.args[0], msg.guild, 'unban', msg.author.id, async (data2) => {
            
        });

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setDescription(`The user with ID ${cm.args[0]} has been unbanned`)
            ]
        });
    }
};