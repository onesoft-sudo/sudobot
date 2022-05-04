const History = require("../src/History");
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

        if (!user || user === null) {
            try {
                user = {
                    id: cm.args[0]
                };
            }
            catch(e) {
                console.log(e);
            }
        }

        if (!user || user === null) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`Invalid user given.`)
                ]
            });

            return;
        }

        let u = user;

        History.get(user.id, msg.guild, async (data) => {
            let str = '';

            for await (let row of data) {
                try {
                    var mod = await msg.guild.members.cache.find(m => m.id === row.mod_id).user.tag;
                    // = mod.user.tag;
                    var user = await msg.guild.members.cache.find(m => m.id === row.user_id).user.tag;
                }
                catch(e) {
                    console.log(e);
                }

                if (!mod) {
                    console.log(mod);
                    mod = row.mod_id;
                }
                if (!user) {
                    user = row.user_id;
                }

                str += `\`[${new Date(row.date).toLocaleString()}] [${mod}]`;
                let type;

                if (row.type === 'ban') {
                    type = 'Banned';
                }
                else if (row.type === 'unban') {
                    type = 'Unbanned';
                }
                else if (row.type === 'kick') {
                    type = 'Kicked';
                }
                else if (row.type === 'mute') {
                    type = 'Muted';
                }
                else if (row.type === 'unmute') {
                    type = 'Unmuted';
                }
                else if (row.type === 'warn') {
                    type = 'Warned';
                }
                else if (row.type === 'warndel') {
                    type = 'Deleted warning for';
                }

                str += ` ${type} ${user}\`\n`;
            }

            let a = {
                name: user === undefined ? (u.user?.tag !== undefined ? u.user.tag : u.id) : user,
            }; 

            if (str === '') {
                str = 'No history.';
            }

            console.log(user);

            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setAuthor(a)
                    .setDescription(str)
                ]
            });
        });
    }
};