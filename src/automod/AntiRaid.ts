import { Collection, Guild, GuildMember, TextChannel } from 'discord.js';
import DiscordClient from '../client/Client';
import { lockAll } from '../commands/moderation/LockallCommand';

export default class AntiRaid {
    constructor(private client: DiscordClient, private joins = 0, private maxJoins = 0, private channels: string[] = [], private exclude = false, private time = 0, private enabled = false) {
        
    }

    load(guild: Guild) {
        this.maxJoins = this.client.config.props[guild.id].raid.max_joins;
        this.channels = this.client.config.props[guild.id].raid.channels;
        this.time = this.client.config.props[guild.id].raid.time;
        this.enabled = this.client.config.props[guild.id].raid.enabled;
        this.exclude = this.client.config.props[guild.id].raid.exclude;
    }

    async start(member: GuildMember) {
        if (member.user.bot) {
            console.log('bot');
            return;
        }

        await this.load(member.guild);

        if (!this.enabled)
            return;

        console.log('Joined');

        setTimeout(() => {
            this.joins = 0;
            console.log('RAID reset');
        }, this.time);

        this.joins++;

        if (this.joins === this.maxJoins) {
            await this.trigger(member.guild);
        }
    }

    async trigger(guild: Guild) {
        let role = guild.roles.everyone;
            
        let channels = <Collection <string, TextChannel>> guild.channels.cache.filter(channel => {
            let cond: boolean;

            if (this.exclude) {
                cond = this.channels.indexOf(channel.id) === -1 && this.channels.indexOf(channel.parent?.id!) === -1;
            }
            else {
                cond = this.channels.indexOf(channel.id) !== -1 || this.channels.indexOf(channel.parent?.id!) !== -1;
            }

            return cond && channel.type === 'GUILD_TEXT';
        });

        await lockAll(this.client, role, channels, this.client.user!, true);
    }
};