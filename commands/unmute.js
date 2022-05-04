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

        this.unmute(user, msg);
    },
    async unmute(user, msg, guild, log, t) {
        if (guild === undefined) {
            guild = msg.guild;
        }

        try {
            let mutedRole = await guild.roles.cache.find(role => role.id === app.config.get('mute_role'));
            let generalRole = await guild.roles.cache.find(role => role.id === app.config.get('gen_role'));

            if (typeof mutedRole !== 'object' || mutedRole === null) {
                await msg?.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription(`No muted role is set.`)
                    ]
                });
    
                return;
            }

            if (typeof generalRole !== 'object' || generalRole === null) {
                await msg?.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription(`No general role is set.`)
                    ]
                });
    
                return;
            }

            if (!log)
                await History.create(user.id, guild, 'unmute', msg.author.id, async (data2) => {});

            await user.roles.add(generalRole);
            await user.roles.remove(mutedRole);

        
            await app.logger.logUnmute(user, t === undefined ? msg.author : t);
            
        }
        catch(e) {
            console.log(e);

            await msg?.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`:x: I don't have enough permission to remove the muted role to this user.`)
                ]
            });

            return;
        }

        await app.db.get("DELETE FROM unmutes WHERE user_id = ? AND guild_id = ?", [user.id, guild.id], async (err) => {

        });

        await user.send({
            embeds: [
                new MessageEmbed()
                .setAuthor({
                    iconURL: guild.iconURL(),
                    name: `\tYou have been unmuted in ${guild.name}`
                })
            ]
        });

        await msg?.reply({
            embeds: [
                new MessageEmbed()
                .setDescription(`The user ${user.user.tag} has been unmuted`)
            ]
        });
    }
};