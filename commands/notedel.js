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

            await app.db.get('DELETE FROM notes WHERE id = ? AND guild_id = ?', [cm.args[0], msg.guild.id], async (err) => {
                if (err) {
                    console.log(err);
                }

                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setDescription('Note has been deleted')
                    ]
                });
            });
        });

    }
};