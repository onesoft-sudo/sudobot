const MessageEmbed = require("../src/MessageEmbed");

module.exports = {
    async handle(msg, cm) {
        app.db.get("SELECT * FROM afk WHERE user_id = ?", [msg.author.id], async (err, data) => {
            if (data) {
                this.notAFK(msg, data);
            }
            else {
                this.AFK(msg, cm);
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
    async AFK(msg, cm) {
        app.db.get('INSERT INTO afk(user_id, date, mentions, reason) VALUES(?, ?, ?, ?)', [msg.author.id, new Date().toISOString(), '0', cm.args[0] === undefined ? '' : cm.args.join(' ')], async (err) => {
            await msg.channel.send({
                embeds: [
                    new MessageEmbed()
                    .setDescription('Your\'re AFK now.' + (cm.args[0] === undefined ? '' : ` Your status has been updated to: **${cm.args.join(' ').replace(/\*/g, '\\*')}**`))
                ]
            });
        });
    }
};