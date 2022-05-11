const { mute } = require("../commands/mute");
const { unmute } = require("../commands/unmute");
const { warn } = require("../commands/warn");
const History = require("./History");
const MessageEmbed = require("./MessageEmbed");

class SpamFilter {
    constructor() {
        this.users = new Map();
    }

    load() {
        this.config = app.config.get('spam_filter');
        this.LIMIT = this.config.limit;    
        this.SAMELIMIT = this.config.samelimit;    
        this.DIFF = this.config.diff;
        this.TIME = this.config.time;
        this.UNMUTE = this.config.unmute_in;
        this.charDiffs = this.config.chars;
        this.wordDiffs = this.config.words;
        this.enabled = this.config.enabled;
        global.reset = true;
        global.reset1 = true;
    }

    almostSameChars(str) {
        return (new RegExp('(.+)\\1{' + this.charDiffs + ',}', 'gm')).test(str.trim());
    } 

    almostSameText(str) {
        return (new RegExp('^(.+)(?: +\\1){' + this.wordDiffs + '}', 'gm')).test(str.trim());
    } 

    filter(msg) {
        if (this.almostSameChars(msg.content)) {
            return false;
        }

        if (this.almostSameText(msg.content)) {
            return false;
        }

        return true;
    }

    async basic(msg) {
        this.load();
        
        if(msg.author.bot || this.config.exclude.indexOf(msg.channel.id) !== -1 || this.config.exclude.indexOf(msg.channel.parent?.id) !== -1 || !this.enabled || msg.member.roles.cache.has(app.config.get('mod_role'))) 
            return;

        if (!this.filter(msg)) {
            await msg.delete();
            await msg.channel.send({
                embeds: [
                    new MessageEmbed()
                    .setDescription("Deleted a message (Spam filter)")
                ]
            });
            
            return;
        }
    }

    async start(msg) {
        this.load();
        
        if(msg.author.bot || this.config.exclude.indexOf(msg.channel.id) !== -1 || this.config.exclude.indexOf(msg.channel.parent?.id) !== -1 || !this.enabled || msg.member.roles.cache.has(app.config.get('mod_role'))) 
            return;

        if (!this.filter(msg)) {
            await msg.delete();
            await msg.channel.send({
                embeds: [
                    new MessageEmbed()
                    .setDescription("Deleted a message (Spam filter)")
                ]
            });
            
            return;
        }

        if (this.users.has(msg.author.id)) {
            const user = this.users.get(msg.author.id);
            const interval = msg.createdTimestamp - user.lastmsg.createdTimestamp;

            console.log(interval);

            if (user.lastmsg && user.lastmsg.content.trim() === msg.content.trim() && user.matched) {
                user.matched = true;
            }
            else {
                user.matched = false;
            }

            user.lastmsg = msg;

            if (interval > this.DIFF) {
                clearTimeout(user.timeout);
                console.log('Cleared timeout');

                user.count = 1;

                user.timeout = setTimeout(() => {
                    this.users.delete(msg.author.id);
                    console.log('deleted (RESET)');
                    reset = true;
                }, this.TIME);

                this.users.set(msg.author.id, user);
            }
            else {
                user.count++;

                const muteOuter = async () => {
                    await app.db.get("SELECT * FROM spam WHERE user_id = ?", [msg.author.id], async (err, data) => {
                        console.log(data);
                        if (data !== undefined && data !== null) {
                            if (data.strike === 1) {
                                await warn(msg.author, "Spamming\nThe next violations will cause mutes.", msg, () => {
                                    console.log('warned');
                                }, app.client.user);
                            }
                            if (data.strike >= 2) {
                                let u = await msg.guild.members.fetch(msg.author.id);
                                await mute(u, "Spamming", msg, true, false);
                                
                                await History.create(u.id, msg.guild, 'mute', app.client.user.id, async (data2) => {});

                                let timeMs = this.UNMUTE;
                                let time = (new Date()).getTime() + timeMs;

                                await app.db.get("INSERT INTO unmutes(user_id, guild_id, time) VALUES(?, ?, ?)", [msg.author.id, msg.guild.id, new Date(time).toISOString()], async (err) => {
                                    if (err) 
                                        console.log(err);
                                    
                                        console.log('A timeout has been set.');
                    
                                        setTimeout(async () => {
                                            await app.db.get("SELECT * FROM unmutes WHERE time = ?", [new Date(time).toISOString()], async (err, data) => {
                                                if (err)
                                                    console.log(err);
                                                
                                                if (data) {
                                                    await app.db.get('DELETE FROM unmutes WHERE id = ?', [data.id], async (err) => {
                                                        let guild = await app.client.guilds.cache.find(g => g.id === data.guild_id);
                                                        let member = await guild?.members.cache.find(m => m.id === data.user_id);
                            
                                                        if (member) {
                                                            await unmute(member, null, guild, true, app.client.user);
                                                            await History.create(u.id, msg.guild, 'unmute', app.client.user.id, async (data2) => {});
                                                        }
                            
                                                        console.log(data);
                                                    });
                                                }
                                            });
                                        }, timeMs);
                                });
                            }
                            
                            await app.db.get("UPDATE spam SET strike = strike + 1 WHERE id = ?", [data.id], () => null);
                        }
                        else {
                            await app.db.get("INSERT INTO spam(user_id, date, strike) VALUES(?, ?, 1)", [msg.author.id, (new Date()).toISOString()], async (err) => {
                                if (err) {
                                    console.log(err);
                                }

                                
                                await msg.reply({
                                    content: "Whoa there! Calm down and please don't spam!"
                                });
                            });
                        }
                    });
                    
                    user.count = 1;
                    this.users.set(msg.author.id, user);
                };

                if (user.count === this.SAMELIMIT && user.matched) {
                    await muteOuter();
                    console.log('here <3');
                }
                else if (user.count === this.LIMIT) {
                    await muteOuter();
                }
                else {
                    this.users.set(msg.author.id, user);
                }
            }
        }
        else {
            this.users.set(msg.author.id, {
                count: 1,
                lastmsg: msg,
                timeout: setTimeout(() => {
                    this.users.delete(msg.author.id);
                    console.log('deleted');
                }, this.TIME),
                matched: true
            });
        }
    }
}

module.exports = SpamFilter;