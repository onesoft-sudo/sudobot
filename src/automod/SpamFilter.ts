import { userMention } from "@discordjs/builders";
import { Collection, Guild, Message, TextChannel } from "discord.js";
import DiscordClient from "../client/Client";
import { mute } from "../commands/moderation/MuteCommand";
import { warn } from "../commands/moderation/WarnCommand";

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
    exclude: string[] = [];
    enabled: boolean = true;
    SpamViolation: typeof import("../models/SpamViolation");

    constructor(protected client: DiscordClient) {
        this.SpamViolation = require("../models/SpamViolation");
    }

    load(guild: Guild) {
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
                    const [spamViolation, isCreated] = await SpamViolation.findOrCreate({
                        defaults: {
                            user_id: author.id,
                            guild_id: guild!.id,
                        },
                        where: {
                            user_id: author.id,
                            guild_id: guild!.id,
                        },
                        order: [
                            ['id', 'DESC']
                        ]
                    });

                    if (isCreated) {
                        await message.channel.send({
                            content: `Whoa there ${userMention(author.id)}! Calm down and please don't spam!`
                        });

                        return;
                    }

                    const rawData = spamViolation.get();

                    if (rawData.strike === 2) {
                        await warn(this.client, author, `Spamming\nThe next violations will cause mutes.`, message, this.client.user!);
                    }
                    else if (rawData.strike > 2) {
                        await mute(this.client, Date.now() + 20000, member!, message, 20000, `Spamming`);
                    }
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