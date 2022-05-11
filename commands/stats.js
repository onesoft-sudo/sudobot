const MessageEmbed = require("../src/MessageEmbed");

module.exports = {
    async handle(msg, cm) {
        let members = 0;
        let bots = 0;
        
        msg.guild.members.cache.forEach(m => {
            if (m.user.bot)
                bots++;
            else 
                members++;
        });
        
        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setAuthor({
                    name: msg.guild.name,
                    iconURL: msg.guild.iconURL(),
                })
                .addFields([
                    {
                        name: "Members",
                        inline: true,
                        value: members + ''
                    },
                    {
                        name: "Bots",
                        inline: true,
                        value: bots + ''
                    },
                    {
                        name: "Total Members",
                        inline: true,
                        value: (members + bots) + ''
                    }
                ])
                .addField('Roles', msg.guild.roles.cache.size + '')
                .addField('Text Channels', msg.guild.channels.cache.filter(c => c.type === 'GUILD_TEXT').size + '')
                .addField('Emojis', msg.guild.emojis.cache.size + '')
                .addField('Stickers', msg.guild.stickers?.cache.size + '')
            ]
        });
    }
};