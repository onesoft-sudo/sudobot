const MessageEmbed = require("../src/MessageEmbed");
const ms = require('ms');
const { unmute } = require("./unmute");

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
        let tmp = false;
        let timeMs, time2;

        let time = cm.args.find(arg => {
            if (arg === '-t') {
                tmp = true;
                return false;
            }

            return tmp;
        });

        if (time) {
            timeMs = ms(time);

            if (timeMs === undefined) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription(`The option \`-t\` requires one argument and it must be a valid time interval.`)
                    ]
                });
    
                return;
            }

            time2 = timeMs + new Date().getTime();
        }

        let args = [...cm.args];

        args.shift();
        delete args[args.indexOf(time)];
        delete args[args.indexOf('-t')];

        if (args.length > 0) {
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

        if (time) {
            await app.db.get("INSERT INTO unmutes(user_id, guild_id, time) VALUES(?, ?, ?)", [user.id, msg.guild.id, new Date(time2).toISOString()], async (err) => {
                if (err) 
                    console.log(err);
                
                    console.log('A timeout has been set.');

                    setTimeout(async () => {
                        await app.db.get("SELECT * FROM unmutes WHERE time = ?", [new Date(time2).toISOString()], async (err, data) => {
                            if (err)
                                console.log(err);
                            
                            if (data) {
                                await app.db.get('DELETE FROM unmutes WHERE id = ?', [data.id], async (err) => {
                                    let guild = await app.client.guilds.cache.find(g => g.id === data.guild_id);
                                    let member = await guild?.members.cache.find(m => m.id === data.user_id);
        
                                    if (member)
                                        await unmute(member, null, guild);
        
                                    console.log(data);
                                });
                            }
                        });
                    }, timeMs);
            });
        }

        this.mute(user, reason, msg);
    },
    async mute(user, reason, msg) {
        try {
            let mutedRole = await msg.guild.roles.cache.find(role => role.id === app.config.get('mute_role'));
            let generalRole = await msg.guild.roles.cache.find(role => role.id === app.config.get('gen_role'));

            if (typeof mutedRole !== 'object' || mutedRole === null) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription(`No muted role is set.`)
                    ]
                });
    
                return;
            }

            if (typeof generalRole !== 'object' || generalRole === null) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription(`No general role is set.`)
                    ]
                });
    
                return;
            }

            await user.roles.add(mutedRole);
            await user.roles.remove(generalRole);
        }
        catch(e) {
            console.log(e);

            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`:x: I don't have enough permission to assign the muted role to this user.`)
                ]
            });

            return;
        }

        await user.send({
            embeds: [
                new MessageEmbed()
                .setAuthor({
                    iconURL: msg.guild.iconURL(),
                    name: `\tYou have been muted in ${msg.guild.name}`
                })
                .addFields([
                    {
                        name: "Reason",
                        value: typeof reason === 'undefined' || reason.trim() === '' ? '*No reason provided*' : reason
                    }
                ])
            ]
        });

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setDescription(`The user ${user.user.tag} has been muted`)
                .addFields([
                    {
                        name: "Reason",
                        value: typeof reason === 'undefined' || reason.trim() === '' ? '*No reason provided*' : reason
                    }
                ])
            ]
        });
    }
};