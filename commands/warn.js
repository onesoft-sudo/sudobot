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
        let reason;

        if (typeof cm.args[1] !== 'undefined') {
            let args = [...cm.args];
            args.shift();

            await (reason = args.join(' '));
        }

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

        await this.warn(user, reason, msg, async (data) => {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setDescription(`The user ${user.user.tag} has been warned`)
                    .addFields([
                        {
                            name: "Reason",
                            value: typeof reason === 'undefined' ? '*No reason provided*' : reason
                        },
                        {
                            name: "Strike",
                            value: data.count + ' time(s)'
                        },
                        {
                            name: "ID",
                            value: data.id + ''
                        }
                    ])
                ]
            });

            console.log(data);
        });
    },
    async warn(user, reason, msg, callback, warned_by1) {
        await app.db.get('INSERT INTO warnings(user_id, guild_id, strike, reason, warned_by) VALUES(?, ?, 1, ?, ?)', [user.id, msg.guild.id, reason === undefined ? '\c\b\c' : reason, warned_by1 === undefined ? msg.author.id : warned_by1], async (err) => {
            if (err) {
                console.log(err);
            }

            await app.db.get('SELECT id, user_id, guild_id, COUNT(*) AS count FROM warnings WHERE user_id = ? AND guild_id = ? ORDER BY id DESC LIMIT 0, 1', [user.id, msg.guild.id], async (err, data) => {
                if (err) {
                    console.log(err);
                }

                await user.send({
                    embeds: [
                        new MessageEmbed()
                        .setAuthor({
                            iconURL: msg.guild.iconURL(),
                            name: `\tYou have been warned in ${msg.guild.name}`
                        })
                        .addFields([
                            {
                                name: "Reason",
                                value: typeof reason === 'undefined' ? '*No reason provided*' : reason
                            },
                            {
                                name: "Strike",
                                value: data.count + ' time(s)'
                            }
                        ])
                    ]
                });

                callback(data);
            });
        });
    }
};