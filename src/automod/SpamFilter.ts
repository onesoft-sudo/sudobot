import { mute } from "../commands/moderation/MuteCommand";
import { unmute } from "../commands/moderation/UnmuteCommand";
import History from "./History";
import MessageEmbed from "../client/MessageEmbed";
import DiscordClient from "../client/Client";
import { Message, TextChannel } from "discord.js";

let warn: Function;

export type SpamFilterConfig = {
    limit: number;
    samelimit: number;
    diff: number;
    time: number;
    unmute_in: number;
    enabled: boolean;
    exclude: string[]
};

export default class SpamFilter {
    users: { [key: string | number]: Map <string, any> } = {};
    config: SpamFilterConfig;
    LIMIT: number = 0;
    SAMELIMIT: number = 0;
    DIFF: number = 0;
    UNMUTE: number = 0;
    TIME: number = 0;
    enabled: boolean = true;

    constructor(private client: DiscordClient) {
        this.config = {} as any;
        warn = require("../commands/moderation/WarnCommand").warn;
    }

    load() {
        this.config = this.client.config.get('spam_filter');
        this.LIMIT = this.config.limit;    
        this.SAMELIMIT = this.config.samelimit;    
        this.DIFF = this.config.diff;
        this.TIME = this.config.time;
        this.UNMUTE = this.config.unmute_in;
        this.enabled = this.config.enabled;
        (global as any).reset = true;
        (global as any).reset1 = true;
    }

    async start(msg: Message) {
        this.load();
        
        if(msg.author.bot || this.config.exclude.indexOf(msg.channel.id) !== -1 || this.config.exclude.indexOf((msg.channel as TextChannel).parent?.id!) !== -1 || !this.enabled || msg.member!.roles.cache.has(this.client.config.get('mod_role'))) 
            return;

        if (!this.users[msg.guild!.id]) {
            this.users[msg.guild!.id] = new Map();
        }

        const users = this.users[msg.guild!.id];

        if (users.has(msg.author.id)) {
            const user = users.get(msg.author.id);
            const interval = msg.createdTimestamp - user.lastmsg.createdTimestamp;

            console.log(interval);

            if (user.lastmsg && user.lastmsg.content.trim() === msg.content.trim()) {
                user.samecount++;
            }
            else {
                user.samecount = 1;
            }

            user.lastmsg = msg;

            if (interval > this.DIFF) {
                clearTimeout(user.timeout);
                console.log('Cleared timeout');

                user.count = 1;

                user.timeout = setTimeout(() => {
                    users.delete(msg.author.id);
                    console.log('deleted (RESET)');
                    (global as any).reset = true;
                }, this.TIME);

                users.set(msg.author.id, user);
            }
            else {
                user.count++;

                const muteOuter = async () => {
                    await this.client.db.get("SELECT * FROM spam WHERE user_id = ? AND guild_id = ?", [msg.author.id, msg.guild!.id], async (err: any, data: any) => {
                        console.log(data);
                        if (data !== undefined && data !== null) {
                            if (data.strike === 1) {
                                await warn(this.client, msg.author, "Spamming\nThe next violations will cause mutes.", msg, this.client.user!);
                                console.log('warned');                                
                            }
                            if (data.strike >= 2) {
                                let u = await msg.guild!.members.fetch(msg.author.id);
                                let timeMs = this.UNMUTE;
                                let time = (new Date()).getTime() + timeMs;

                                await mute(this.client, time, u, msg, timeMs, 'Spamming');
                            }
                            
                            await this.client.db.get("UPDATE spam SET strike = strike + 1 WHERE id = ?", [data.id], () => null);
                        }
                        else {
                            await this.client.db.get("INSERT INTO spam(user_id, date, strike, guild_id) VALUES(?, ?, 1, ?)", [msg.author.id, (new Date()).toISOString(), msg.guild!.id], async (err: any) => {
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
                    users.set(msg.author.id, user);
                };

                if (user.samecount === this.SAMELIMIT) {
                    await muteOuter();
                    console.log('here <3');
                }
                else if (user.count === this.LIMIT) {
                    await muteOuter();
                }
                else {
                    users.set(msg.author.id, user);
                }
            }
        }
        else {
            users.set(msg.author.id, {
                count: 1,
                lastmsg: msg,
                timeout: setTimeout(() => {
                    users.delete(msg.author.id);
                    console.log('deleted');
                }, this.TIME),
                samecount: 1,
            });
        }
    }
};