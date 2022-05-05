const MessageEmbed = require("../src/MessageEmbed");

module.exports = {
    async handle(msg, cm) {
        app.db.get("SELECT * FROM afk WHERE user_id = ?", [msg.author.id], async (err, data) => {
            if (data) {
                this.notAFK(msg, data);
            }
            else {
                this.AFK(msg);
            }
        });
    },
    async notAFK(msg, data) {
        app.db.get('DELETE FROM afk WHERE user_id = ?', [msg.author.id], async (err) => {
            await msg.channel.send({
                embeds: [
                    new MessageEmbed()
                    .setDescription('You\'re no longer AFK. You had **' + data.mentions + '** mentions in the servers where SudoBot is joined.')
                ]
            });
        });
    },
    async AFK(msg) {
        app.db.get('INSERT INTO afk(user_id, date, mentions) VALUES(?, ?, ?)', [msg.author.id, new Date().toISOString(), '0'], async (err) => {
            await msg.channel.send({
                embeds: [
                    new MessageEmbed()
                    .setDescription('Your status has been updated to AFK.')
                ]
            });
        });
    }
};