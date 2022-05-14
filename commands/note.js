const History = require("../src/History");
const MessageEmbed = require("../src/MessageEmbed");
const { getUser } = require("../src/UserInput");

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
        
        let content;

        let args = [...cm.args];
        args.shift();

        await (content = args.join(' '));
        
        await History.create(user.id, msg.guild, 'note', msg.author.id, null, async (data2) => {
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