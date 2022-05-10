const { Permissions } = require("discord.js");
const MessageEmbed = require("../src/MessageEmbed");

module.exports = {
    needsOptionParse: true,
    async handle(msg, cm) {
        let channel;

        if (typeof cm.normalArgs[0] === 'undefined') {
            channel = msg.channel;
        }

        let role = msg.guild.roles.everyone;

        if (role) {
            if (!channel) {
                channel = msg.mentions?.channels?.first();

                if (!channel) {
                    channel = msg.guild.channels.cache.find(c => c.id === cm.normalArgs[0]);
                }
            }

            if (channel) {
                if (cm.options.indexOf('--no-send') === -1) {
                    try {
                        if (cm.options.indexOf('--no-send') === -1) {
                            await channel.send({
                                embeds: [
                                    new MessageEmbed()
                                    .setDescription(':closed_lock_with_key: This channel has been unlocked.')
                                ]
                            });
                        }
    
                        app.db.get('SELECT * FROM locks WHERE channel_id = ?', [channel.id], async (err, data) => {
                            if (data || cm.options.indexOf('--force') !== -1) {
                                let perm1;
                                let perm;
                                const data1 = data?.perms?.split(',');
    
                                if (data1) {
                                    if (data1[0] === 'DENY') {
                                        await (perm = false);
                                    }
                                    else if (data1[0] === 'NULL') {
                                        await (perm = null);
                                    }
                                    else if (data1[0] === 'ALLOW') {
                                        await (perm = true);
                                    }
        
                                    if (data1[1] === 'DENY') {
                                        await (perm1 = false);
                                    }
                                    else if (data1[1] === 'NULL') {
                                        await (perm1 = null);
                                    }
                                    else if (data1[1] === 'ALLOW') {
                                        await (perm1 = true);
                                    }
                                }
                                
                                if (cm.options.indexOf('--force') !== -1) {
                                    await (perm1 = true);
                                    await (perm = true);
                                }
    
                                await console.log(channel.name);
    
                                try {
                                    await channel.permissionOverwrites.edit(role, {
                                        SEND_MESSAGES: perm,
                                    });
    
                                    const gen = await msg.guild.roles.fetch(app.config.props[msg.guild.id].gen_role);
    
                                    await channel.permissionOverwrites.edit(gen, {
                                        SEND_MESSAGES: perm1,
                                    });
                                }
                                catch (e) {
                                    console.log(e);
                                }
    
                                await console.log(perm, perm1);
    
                                if (data) {
                                    await app.db.get('DELETE FROM locks WHERE id = ?', [data?.id], async (err) => {});
                                }
                            }
                        });
                    }
                    catch(e) {
                        console.log(e);
                    }
                }
                
                channel.permissionOverwrites.edit(role, {
                    SEND_MESSAGES: true,
                });
            }
            else {
                console.log('invalid channel');
            }
        }        

        // await msg.reply({
        //     embeds: [
        //         new MessageEmbed()
        //         .setDescription(`The user ${user.user.tag} has been beaned`)
        //         .addFields([
        //             {
        //                 name: "Reason",
        //                 value: typeof reason === 'undefined' ? '*No reason provided*' : reason
        //             }
        //         ])
        //     ]
        // });
    }
};