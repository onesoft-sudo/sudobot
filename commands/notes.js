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