const { emoji } = require('../src/emoji');
const MessageEmbed = require('../src/MessageEmbed');

module.exports = {
    async handle(msg, cm) {
        if (cm.args[0] === undefined) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription('This command requires at least 2 arguments')
                ]
            });

            return;
        }

        let user = msg.mentions.members.first();

        if (!user) {
            user = msg.guild.members.cache.find(m => m.id === cm.args[0]);
        }

        if (!user) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription('Invalid user given.')
                ]
            });

            return;
        }

        const args = [...cm.args];      
        args.shift();

        if (msg.attachments.size < 1 && args.length < 1) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription('This command requires at least 2 arguments')
                ]
            });

            return; 
        }

        const content = args.join(' ');

        try {
            let message = {};

            if (content.trim() != '') {
                message.content = content;
            }

            if (msg.attachments && msg.attachments.size > 0) {
                message.files = msg.attachments.map(a => {
                    return {
                        attachment: a.proxyURL,
                        name: a.name
                    }
                });
            }

            await user.send(message);

            await msg.reply({
                content: (await emoji('check'))?.toString() + " Message Sent!"
            });
        }
        catch(e) {
            console.log(e);

            await msg.reply({
                content: "Message could not be sent, maybe the user has disabled DMs?"
            });
        }
    }
};