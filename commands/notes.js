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

        await app.db.all("SELECT * FROM notes WHERE user_id = ? AND guild_id = ?", [user.id, msg.guild.id], async (err, data) => {
            if (err) {
                console.log(err);
            }

            if (data === undefined || data.length < 1) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription('No notes found for user ' + user.user.tag)
                    ]
                });

                return;
            }

            let desc = '';
            let i = 1;

            for (let row of data) {
                desc += `\n\n**Note #${i}**\n${row.content}\nDate: ${new Date(row.date).toUTCString()}`;
                i++;
            }

            desc = desc.substring(1);

            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setAuthor({
                        iconURL: user.displayAvatarURL(),
                        name: user.user.tag
                    })
                    .setDescription(desc)
                ]
            });
        });

    }
};