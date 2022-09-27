import { GuildMember } from "discord.js";
import { mute } from "../commands/moderation/MuteCommand";
import { unmute } from "../commands/moderation/UnmuteCommand";
import ProfileFilterRecord, { IProfileFilterRecord } from "../models/ProfileFilterRecord";
import Service from "../utils/structures/Service";

export enum ProfileFilterAction {
    NONE = 'none',
    MUTE = 'MUTE'
}

export enum ProfileFilterIssue {
    NICKNAME = 2,
    TAG = 3
}

export default class ProfileFilter extends Service {
    hasIssues(member: GuildMember): ProfileFilterIssue | null {
        const config = this.client.config.props[member.guild.id];
        const { components } = config.profile_filter;
        
        if (components.nickname && member.nickname && !this.testString(member.guild.id, member.nickname.toLowerCase())) {
            return ProfileFilterIssue.NICKNAME;
        }

        if (components.tag && !this.testString(member.guild.id, member.user.tag.toLowerCase())) {
            return ProfileFilterIssue.TAG;
        }

        return null;
    }

    private testString(guildID: string, string: string) {
        const config = this.client.config.props[guildID];
        const { inherit_from_words, inherit_from_regex, inherit_from_tokens, blocked_words, blocked_tokens, blocked_regex_patterns } = config.profile_filter;
        const words: string[] = inherit_from_words ? [...blocked_words, ...config.filters.words] : blocked_words;
        const tokens: string[] = inherit_from_tokens ? [...blocked_tokens, ...config.filters.tokens] : blocked_tokens;
        const patterns: string[] = inherit_from_regex ? [...blocked_regex_patterns, ...config.filters.regex_patterns] : blocked_regex_patterns;

        for (const token of tokens) {
            if (string.includes(token)) {
                return false;
            }
        }

        const splitted = string.split(/ +/);

        for (const word of splitted) {
            if (words.includes(word)) {
                return false;
            }
        }

        for (const pattern of patterns) {
            if (new RegExp(pattern, 'g').test(string)) {
                return false;
            }
        }

        return true;
    }

    async takeAction(member: GuildMember, issue: ProfileFilterIssue) {
        const config = this.client.config.props[member.guild.id];
        const { actions } = config.profile_filter;
        
        await ProfileFilterRecord.create({
            user: member.id,
            guild: member.guild.id,
            createdAt: new Date(),
            action: issue !== ProfileFilterIssue.NICKNAME ? (issue !== ProfileFilterIssue.TAG ? ProfileFilterAction.NONE : actions.tag) : actions.nickname 
        });

        if (issue === ProfileFilterIssue.NICKNAME) {
            if (actions.nickname === ProfileFilterAction.MUTE) {
                await mute(this.client, undefined, member, { guild: member.guild!, member: member.guild!.me! }, undefined, "Your nickname contains a banned word/token.\nPlease update your nickname and you'll be automatically unmuted.");
                return;
            }
        }

        if (issue === ProfileFilterIssue.TAG) {
            if (actions.tag === ProfileFilterAction.MUTE) {
                await mute(this.client, undefined, member, { guild: member.guild!, member: member.guild!.me! }, undefined, "Your tag contains a banned word/token.\nPlease update your tag and you'll be automatically unmuted.");
                return;
            }
        }
    }

    async takeBack(member: GuildMember, profileFilterRecord: IProfileFilterRecord) {
        if (profileFilterRecord.action === ProfileFilterAction.MUTE) {
            await unmute(this.client, member, this.client.user!);
        }

        await profileFilterRecord.delete();
    }

    async check(member: GuildMember) {
        const config = this.client.config.props[member.guild.id];

        if (!config.profile_filter.enabled || member.roles.cache.has(config.mod_role)) {
            return true;
        }

        const issue = this.hasIssues(member);
        const profileFilterRecord = await ProfileFilterRecord.findOne({ user: member.id, guild: member.guild.id });

        if (!issue) {
            if (profileFilterRecord) {
                await this.takeBack(member, profileFilterRecord);
            }

            return true;
        }

        if (!profileFilterRecord)
            await this.takeAction(member, issue);        

        return false;
    }
}