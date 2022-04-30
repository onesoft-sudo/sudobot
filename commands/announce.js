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

        const announcement = await msg.content.substring(msg.content.indexOf(' '));
        
        try {
            const channel = await msg.guild.channels.cache.find(c => c.id === app.config.get('announcement_channel'));

            if (!channel) {
                await msg.reply({
                    content: ":x: Channel not found"
                });

                return;
            }

            await channel.send({
                content: announcement
            });

            await msg.react('✅');
        }
        catch(e) {
            console.log(e);

            await msg.reply({
                content: ":x: Failed to send message"
            });
        }
    }
};