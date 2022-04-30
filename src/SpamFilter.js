const { warn } = require("../commands/warn");
const MessageEmbed = require("./MessageEmbed");

class SpamFilter {
    constructor() {
        this.users = new Map();
    }

    load() {
        this.config = app.config.get('spam_filter');
        this.LIMIT = this.config.limit;    
        this.DIFF = this.config.diff;
        this.TIME = this.config.time;
        this.charDiffs = this.config.chars;
        global.reset = true;
        global.reset1 = true;
    }

    almostSameChars(str) {
        return (new RegExp('(.+)\\1{' + this.charDiffs + ',}', 'gm')).test(str.trim());
    } 

    almostSameText(str) {
        return (new RegExp('^(.+)(?: +\\1){' + this.charDiffs + '}', 'gm')).test(str.trim());
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

    async start(msg) {
        this.load();
        
        if(msg.author.bot || this.config.exclude.indexOf(msg.channel.id) !== -1) 
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

                if (user.count === this.LIMIT) {
                    await app.db.get("SELECT * FROM spam WHERE user_id = ?", [msg.author.id], async (err, data) => {
                        console.log(data);
                        if (data !== undefined && data !== null) {
                            if (data.strike >= 1) {
                                await warn(msg.author, "Spamming", msg, () => {
                                    console.log('warned');
                                }, app.client.user);
                            }                            
                        }
                        else {
                            await app.db.get("INSERT INTO spam(user_id, date) VALUES(?, ?)", [msg.author.id, (new Date()).toISOString()], async (err) => {
                                if (err) {
                                    console.log(err);
                                }

                                
                                await msg.channel.send({
                                    content: "Spam detected."
                                });
                            });
                        }
                    });
                    
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
                }, this.TIME)
            });
        }
    }
}

module.exports = SpamFilter;