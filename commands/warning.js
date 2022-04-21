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

        await app.db.get('SELECT * FROM warnings WHERE id = ?', [cm.args[0]], async (err, data) => {
            if (err) {
                console.log(err);
            }

            if (!data) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription(`No warning found.`)
                    ]
                });
    
                return;
            }

            let user = data.user_id;

            console.log('here1');

            try {
                user = await msg.guild.members.fetch(data.user_id);
            }
            catch(e) {
                console.log(e);
            }


            console.log('user2');

            let by = data.warned_by;

            console.log(data);

            try {
                by = await msg.guild.members.fetch(data.warned_by);
            }
            catch(e) {
                console.log(e);
            }

            console.log('here');
            let embed = await new MessageEmbed()
                        .setDescription(data.reason === '\c\b\c' ? "*No reason provided*" : data.reason)
                        .addField('ID', data.id + '')
                        .addField('Warned by', typeof by === 'string' ? by : by.user.tag);
            
            if (typeof user === 'string') {
                embed.setAuthor({
                    name: `${user}`
                });
            }
            else {
                embed.setAuthor({
                    iconURL: user.displayAvatarURL(),
                    name: `${user.user.tag}`
                })
            }


            await msg.reply({
                embeds: [
                    embed
                ]
            });
        });
    }
};