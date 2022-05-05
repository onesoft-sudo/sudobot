const MessageEmbed = require("../src/MessageEmbed");

module.exports = {
    needsOptionParse: true,
    async handle(msg, cm) {
        if (cm.normalArgs[0] === undefined) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription('This command requires at least 1 argument.')
                ]
            });

            return;
        }

        let user = msg.mentions.members.first();

        if (!user) {
            user = msg.guild.members.cache.find(m => m.id === cm.normalArgs[0]);
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

        let fetched;
        let count = 0;

        const message = await msg.reply({
            embeds: [
                new MessageEmbed()
                .setColor('GOLD')
                .setDescription('Deleting messages...')
            ]
        });

        do {
            fetched = await msg.channel.messages.fetch({ limit: 100 });
            fetched = await fetched.filter(m => m.author.id === user.id);
            await msg.channel.bulkDelete(fetched);
            count += fetched.size;
        }
        while(fetched.size >= 2);

        const guild = await app.client.guilds.fetch(app.config.props.global.id);
        let emoji = ':white_check_mark:';

        if (guild) {
            emoji = await guild.emojis.cache.find(e => e.name === 'check');
        }

        await message.edit({
            embeds: [
                new MessageEmbed()
                .setColor('GREEN')
                .setDescription(emoji.toString() + " Deleted " + count + " message(s) from user " + user.user.tag)
            ]
        });
    }
};