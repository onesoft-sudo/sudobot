const History = require("../src/History");
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

        let reason;

        if (typeof cm.args[1] !== 'undefined') {
            let args = [...cm.args];
            args.shift();

            await (reason = args.join(' '));
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

                console.log('fr');

                await app.logger.logWarn(msg, user, warned_by1 === undefined ? msg.author : warned_by1, typeof reason === 'undefined' ? '*No reason provided*' : reason);
                
                await History.create(user.id, msg.guild, 'warn', warned_by1 === undefined ? msg.author.id : warned_by1.id, typeof reason === 'undefined' ? null : reason, async (data2) => {
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
        });
    }
};