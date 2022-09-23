import { userMention } from "@discordjs/builders";
import { Collection, Guild, Message, TextChannel } from "discord.js";
import DiscordClient from "../client/Client";
import { mute } from "../commands/moderation/MuteCommand";
import { warn } from "../commands/moderation/WarnCommand";
import KeyValuePair from "../types/KeyValuePair";

export interface SpamFilterData {
    count: number,
    lastMessage: Message,
    timeout: NodeJS.Timeout
}

export default class SpamFilter {
    users: {
        [guild: string]: Collection<string, SpamFilterData>
    } = {};

    LIMIT = 5;
    TIME = 5000;
    DIFF = 2500;
    config: KeyValuePair<string | number> = {};
    exclude: string[] = [];
    enabled: boolean = true;
    SpamViolation: typeof import("../models/SpamViolation");

    constructor(protected client: DiscordClient) {
        this.SpamViolation = require("../models/SpamViolation");
    }

    load(guild: Guild) {
        this.config = this.client.config.props[guild.id].spam_filter;
        this.enabled = this.client.config.props[guild.id].spam_filter.enabled;
        this.exclude = this.client.config.props[guild.id].spam_filter.exclude;
    }

    async start(message: Message) {
        const { guild, author, member, channel } = message;
        const { default: SpamViolation } = this.SpamViolation;

        this.load(guild!);

        if(author.bot || this.exclude.indexOf(channel.id) !== -1 || this.exclude.indexOf((channel as TextChannel).parent?.id!) !== -1 || !this.enabled || member!.roles.cache.has(this.client.config.get('mod_role'))) 
            return;

        if (!this.users[guild!.id]) {
            this.users[guild!.id] = new Collection();
        }

        console.log(this.users[guild!.id].get(author.id));

        const users = this.users[guild!.id];

        if (users.has(author.id)) {
            const user = users.get(author.id)!;
            const diff = message.createdTimestamp - user.lastMessage.createdTimestamp;
            
            if (diff > this.DIFF) {
                user.count = 1;
                user.lastMessage = message;
                clearTimeout(user.timeout);
                user.timeout = setTimeout(() => {
                    users.delete(author.id);
                }, this.TIME);
            }
            else {
                user.count++;

                const { count } = user;

                if (count === this.LIMIT) {
                    let spamViolation = await SpamViolation.findOne({
                        user_id: author.id,
                        guild_id: guild!.id,
                    });

                    const isCreated = spamViolation === null;

                    if (!spamViolation) {
                        spamViolation = await SpamViolation.create({
                            user_id: author.id,
                            guild_id: guild!.id,
                            createdAt: new Date()
                        });
                    }

                    if (isCreated) {
                        await message.channel.send({
                            content: `Whoa there ${userMention(author.id)}! Calm down and please don't spam!`
                        });

                        return;
                    }

                    if (spamViolation.strike === 2) {
                        await warn(this.client, author, `Spamming\nThe next violations will cause mutes.`, message, this.client.user!);
                    }
                    else if (spamViolation.strike > 2) {
                        await mute(this.client, Date.now() + (this.config.unmute_in as number), member!, message, this.config.unmute_in as number, `Spamming`);
                        return;
                    }
                    
                    spamViolation.strike++;
                    await spamViolation.save();
                }
                else {
                    user.lastMessage = message;
                    users.set(author.id, user);
                }
            }
        }
        else {
            users.set(author.id, {
                count: 1,
                lastMessage: message,
                timeout: setTimeout(() => {
                    users.delete(author.id);
                }, this.TIME)
            });
        }
    }
}