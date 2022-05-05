const { notAFK } = require("../commands/afk");
const MessageEmbed = require("./MessageEmbed");

module.exports = class AFKEngine {
    mention(msg, user, cb, msg1) {
        app.db.get('SELECT * FROM afk WHERE user_id = ?', [user.id], (err, data) => {
            if (data) {
                if (msg1 === undefined) {
                    msg.channel.send({
                        embeds: [
                            new MessageEmbed()
                            .setDescription(`**${user.user.tag}** is AFK right now${data.reason.trim() == '' ? '.' : (' for reason: **' + data.reason.replace(/\*/g, '\\*') + '**')}`)
                        ]
                    });
                }

                app.db.get('UPDATE afk SET mentions = ? WHERE id = ?', [parseInt(data.mentions) + 1, data.id], (err) => {});

                cb(data);
            }
        });

    }

    start(msg) {
        const mention = msg.mentions.members.first();

        if (mention) {
            this.mention(msg, msg.member, data => {
                if (msg.author.id === data.user_id) {
                    notAFK(msg, data);
                }
            }, true);
            
            msg.mentions.members.forEach((member) => {
                this.mention(msg, member, data => {
                    if (msg.author.id === data.user_id) {
                        notAFK(msg, data);
                    }
                });
            });
        }
        else {
            app.db.get('SELECT * FROM afk WHERE user_id = ?', [msg.author.id], (err, data) => {
                if (data) {
                    notAFK(msg, data);
                }
            });
        }
    }
};