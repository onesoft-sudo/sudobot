const History = require("../src/History");
const MessageEmbed = require("../src/MessageEmbed");

module.exports = {
    async handle(msg, cm) {
        if (typeof cm.args[1] === 'undefined') {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires at least two arguments.`)
                ]
            });

            return;
        }

        var user = await msg.mentions.members.first();
        let content;

        let args = [...cm.args];
        args.shift();

        await (content = args.join(' '));

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
        
        await History.create(user.id, msg.guild, 'note', msg.author.id, async (data2) => {
            this.note(user, content, msg);
        });

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setDescription(`A note has been added for ${user.user.tag}`) // TODO
            ]
        });
    },
    async note(user, content, msg) {
        await app.db.get("INSERT INTO notes(user_id, guild_id, content, date) VALUES(?, ?, ?, ?)", [user.id, msg.guild.id, content, (new Date().toISOString())], async (err) => {
            if (err) {
                console.log(err);
            }
        });
    }
};