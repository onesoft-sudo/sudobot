const MessageEmbed = require("../src/MessageEmbed");
const { getUser } = require("../src/UserInput");

module.exports = {
    async handle(msg, cm) {
        var test = false;

        if (typeof cm.args[0] === 'undefined') {
            var args1 = ['SELECT * FROM warnings WHERE guild_id = ?', [msg.guild.id]];
            var a = {
                name: `All warnings`
            };
        }
        else {
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

            var args1 = ['SELECT id, user_id, guild_id, reason FROM warnings WHERE user_id = ? AND guild_id = ?', [user.id, msg.guild.id]];
            var a = {
                iconURL: user.displayAvatarURL(),
                name: `All warnings for ${user.user.tag} in ${msg.guild.name}`
            };

            test = true;
        }

        await app.db.all(...args1, async (err, data) => {
            if (err) {
                console.log(err);
            }

            let i = 0;

            let warnings = await data.map(value => {
                i++;
                return {
                    name: "Warning " + i + " (ID: " + value.id + (!test ? ", To: " + value.user_id : "") + ")",
                    value: value.reason === '\c\b\c' ? "No reason provided" : value.reason
                };
            });

            if (test) {
                warnings.push(
                    {
                        name: "Strike",
                        value: i + ' time(s)'
                    }
                );
            }

            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setAuthor(a)
                    .addFields(warnings)
                ]
            });
        });
    }
};