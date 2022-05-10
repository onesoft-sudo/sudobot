const { Permissions } = require("discord.js");
const MessageEmbed = require("../src/MessageEmbed");

module.exports = {
    needsOptionParse: true,
    async handle(msg, cm) {
        let channels = app.config.get('lockall');

        if (msg.mentions.channels.first()) {
            channels = msg.mentions.channels;
        }
        else {
            channels = await msg.guild.channels.cache.filter(c => channels.indexOf(c.id) !== -1);
        }
        
        let role = msg.guild.roles.everyone;

        await this.lockAll(role, channels, cm.options.indexOf('--no-send') === -1);
    },
    async lockAll(role, channels, send) {
        if (role) {
            await channels.forEach(async channel => {
                try {
                    if (send) {
                        await channel.send({
                            embeds: [
                                new MessageEmbed()
                                .setDescription(':lock: This channel has been locked.')
                            ]
                        });
                    }

                    let dbPerms;
                    let dbPerms1;

                    let overWrites = await channel.permissionOverwrites.cache.get(role.id);
                    let allowperms = await overWrites?.allow?.has(Permissions.FLAGS.SEND_MESSAGES);
                    let denyperms = await overWrites?.deny?.has(Permissions.FLAGS.SEND_MESSAGES);

                    let role1 = await channel.guild.roles.fetch(app.config.props[channel.guild.id].gen_role);

                    let overWrites1 = await channel.permissionOverwrites.cache.get(role1.id);
                    let allowperms1 = await overWrites1?.allow?.has(Permissions.FLAGS.SEND_MESSAGES);
                    let denyperms1 = await overWrites1?.deny?.has(Permissions.FLAGS.SEND_MESSAGES);

                    if (allowperms && !denyperms) {
                        await (dbPerms = 'ALLOW');
                    }
                    else if (!allowperms && denyperms) {
                        await (dbPerms = 'DENY');
                    }
                    else if (!allowperms && !denyperms) {
                        await (dbPerms = 'NULL');
                    }

                    if (allowperms1 && !denyperms1) {
                        await (dbPerms1 = 'ALLOW');
                    }
                    else if (!allowperms1 && denyperms1) {
                        await (dbPerms1 = 'DENY');
                    }
                    else if (!allowperms1 && !denyperms1) {
                        await (dbPerms1 = 'NULL');
                    }
                    
                    await app.db.get('INSERT INTO locks(channel_id, perms, date) VALUES(?, ?, ?)', [channel.id, dbPerms + ',' + dbPerms1, new Date().toISOString()], async (err) => {
                        if (err)
                            console.log(err);
                        
                        try {
                            await channel.permissionOverwrites.edit(role, {
                                SEND_MESSAGES: false,
                            });
                        }
                        catch (e) {
                            console.log(e);
                        }

                        try {
                            const gen = await channel.guild.roles.fetch(app.config.props[channel.guild.id].gen_role);

                            await channel.permissionOverwrites.edit(gen, {
                                SEND_MESSAGES: false,
                            });
                        }
                        catch (e) {
                            console.log(e);
                        }
                    })
                }
                catch (e) {
                    console.log(e);
                }
            });
        }
    }
};