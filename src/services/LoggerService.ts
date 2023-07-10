/**
* This file is part of SudoBot.
* 
* Copyright (C) 2021-2023 OSN Developers.
*
* SudoBot is free software; you can redistribute it and/or modify it
* under the terms of the GNU Affero General Public License as published by 
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* SudoBot is distributed in the hope that it will be useful, but
* WITHOUT ANY WARRANTY; without even the implied warranty of 
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the 
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License 
* along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
*/

import { formatDistanceToNowStrict } from "date-fns";
import { APIEmbedField, BanOptions, ColorResolvable, Colors, EmbedBuilder, EmbedData, Guild, GuildMember, MessageCreateOptions, MessagePayload, User } from "discord.js";
import Service from "../core/Service";
import { isTextableChannel } from "../utils/utils";

export const name = "logger";

export default class LoggerService extends Service {
    private async send(guild: Guild, options: string | MessagePayload | MessageCreateOptions) {
        const channelId = this.client.configManager.config[guild.id]?.logging?.primary_channel;

        if (!channelId)
            return null;

        try {
            const channel = await guild.channels.fetch(channelId);

            if (!channel || !isTextableChannel(channel))
                return null;

            return await channel.send(options);
        }
        catch (e) {
            console.log(e);
            return null;
        }
    }

    private createLogEmbed({ options, title, user, fields, footerText, timestamp, moderator, reason, id, color }: CreateLogEmbedOptions) {
        const embed = new EmbedBuilder({
            title,
            author: user ? {
                name: user.tag,
                iconURL: user.displayAvatarURL()
            } : undefined,
            fields: moderator || fields ? [
                ...(reason !== undefined ? [
                    {
                        name: 'Reason',
                        value: `${reason ?? '*No reason provided*'}`
                    }
                ] : []),
                ...(fields ?? []),
                ...(moderator ? [
                    {
                        name: 'Responsible Moderator',
                        value: `${moderator.tag} (${moderator.id})`
                    }
                ] : []),
                ...(id ? [
                    {
                        name: 'Infraction ID',
                        value: `${id}`
                    }
                ] : []),
            ] : undefined,
            footer: footerText ? {
                text: footerText
            } : undefined,
            ...options
        });

        if (timestamp === undefined)
            embed.setTimestamp();
        else if (timestamp)
            embed.setTimestamp(timestamp);

        if (color)
            embed.setColor(color);

        return embed;
    }

    private async sendLogEmbed(guild: Guild, options: CreateLogEmbedOptions, extraOptions?: MessagePayload | MessageCreateOptions) {
        return await this.send(guild, {
            embeds: [
                this.createLogEmbed(options)
            ],
            ...((extraOptions as any) ?? {})
        });
    }

    async logUserBan({ moderator, user, deleteMessageSeconds, reason, guild, id }: LogUserBanOptions) {
        this.sendLogEmbed(guild, {
            user,
            title: 'A user was banned',
            footerText: 'Banned',
            reason: reason ?? null,
            moderator,
            id,
            color: Colors.Red,
            fields: [
                {
                    name: "Message Deletion Timeframe",
                    value: deleteMessageSeconds ? formatDistanceToNowStrict(new Date(Date.now() - (deleteMessageSeconds * 1000))) : "*No timeframe provided*"
                }
            ]
        });
    }

    async logMemberKick({ moderator, member, reason, guild, id }: CommonUserActionOptions & { member: GuildMember, reason?: string }) {
        this.sendLogEmbed(guild, {
            user: member.user,
            title: 'A member was kicked',
            footerText: 'Kicked',
            reason: reason ?? null,
            moderator,
            id,
            color: Colors.Orange
        });
    }

    async logMemberMute({ moderator, member, reason, guild, id, duration }: CommonUserActionOptions & { member: GuildMember, reason?: string, duration?: number }) {
        this.sendLogEmbed(guild, {
            user: member.user,
            title: 'A member was muted',
            footerText: 'Muted',
            reason: reason ?? null,
            moderator,
            id,
            color: Colors.DarkGold,
            fields: [
                {
                    name: "Duration",
                    value: duration ? formatDistanceToNowStrict(new Date(Date.now() - duration)) : "*No duration was specified*"
                }
            ]
        });
    }

    async logMemberWarning({ moderator, member, reason, guild, id }: CommonUserActionOptions & { member: GuildMember, reason?: string }) {
        this.sendLogEmbed(guild, {
            user: member.user,
            title: 'A member was warned',
            footerText: 'Warned',
            reason: reason ?? null,
            moderator,
            id,
            color: Colors.Gold,
        });
    }
}

interface LogUserBanOptions extends BanOptions, CommonUserActionOptions {
    user: User;
}

interface CommonUserActionOptions {
    moderator: User;
    guild: Guild;
    id: string;
}

interface CreateLogEmbedOptions {
    id?: string;
    title?: string;
    options?: EmbedData;
    moderator?: User;
    user?: User;
    fields?: APIEmbedField[];
    footerText?: string;
    reason?: string | null;
    timestamp?: Date | false | null;
    color?: ColorResolvable;
}