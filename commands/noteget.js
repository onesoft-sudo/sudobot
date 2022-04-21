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

        await app.db.get("SELECT * FROM notes WHERE id = ? AND guild_id = ?", [cm.args[0], msg.guild.id], async (err, data) => {
            if (err) {
                console.log(err);
            }

            if (data === undefined) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription('No note found')
                    ]
                });

                return;
            }

            let user;

            try {
                user = await msg.guild.members.fetch(data.user_id);
                user = {
                    name: user.user.tag,
                    iconURL: user.displayAvatarURL()
                };
            }
            catch(e) {
                user = {
                    name: "User " + data.user_id
                };
            }

            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setDescription(data.content)
                    .setAuthor(user)
                    .setFields([
                        {
                            name: "ID",
                            value: data.id + ''
                        }
                    ])
                    .setTimestamp(new Date(data.date))
                ]
            });
        });

    }
};