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
import {
    APIEmbedField,
    ActionRowBuilder,
    AttachmentBuilder,
    BanOptions,
    ButtonBuilder,
    ButtonStyle,
    ColorResolvable,
    Colors,
    EmbedBuilder,
    EmbedData,
    Guild,
    GuildChannel,
    GuildMember,
    Message,
    MessageCreateOptions,
    MessagePayload,
    MessageType,
    TextChannel,
    User,
    escapeMarkdown
} from "discord.js";
import Service from "../core/Service";
import { NotUndefined } from "../types/NotUndefined";
import { logError } from "../utils/logger";
import { isTextableChannel } from "../utils/utils";
import { GuildConfig } from "./ConfigManager";

export const name = "logger";

type LoggingChannelType = Exclude<keyof NotUndefined<GuildConfig["logging"]>, "enabled">;

export default class LoggerService extends Service {
    private async send(guild: Guild, options: string | MessagePayload | MessageCreateOptions, channel?: LoggingChannelType) {
        const channelId =
            this.client.configManager.config[guild.id]?.logging?.[channel ?? "primary_channel"] ??
            this.client.configManager.config[guild.id]?.logging?.primary_channel;
        const enabled = this.client.configManager.config[guild.id]?.logging?.enabled;

        if (!enabled || !channelId) return null;

        try {
            const channel = await guild.channels.fetch(channelId);

            if (!channel || !isTextableChannel(channel)) return null;

            return await channel.send(options);
        } catch (e) {
            logError(e);
            return null;
        }
    }

    private createLogEmbed({ options, title, user, fields, footerText, timestamp, moderator, reason, id, color }: CreateLogEmbedOptions) {
        const embed = new EmbedBuilder({
            title,
            author: user
                ? {
                      name: user.tag,
                      iconURL: user.displayAvatarURL()
                  }
                : undefined,
            fields: [
                ...(reason !== undefined
                    ? [
                          {
                              name: "Reason",
                              value: `${reason ?? "*No reason provided*"}`
                          }
                      ]
                    : []),
                ...(fields ?? []),
                ...(moderator
                    ? [
                          {
                              name: "Responsible Moderator",
                              value: moderator.id === this.client.user?.id ? "System" : `${moderator.tag} (${moderator.id})`
                          }
                      ]
                    : []),
                ...(id
                    ? [
                          {
                              name: "Infraction ID",
                              value: `${id}`
                          }
                      ]
                    : []),
                ...(user
                    ? [
                          {
                              name: "User ID",
                              value: user.id
                          }
                      ]
                    : [])
            ],
            footer: footerText
                ? {
                      text: footerText
                  }
                : undefined,
            ...options
        });

        if (timestamp === undefined) embed.setTimestamp();
        else if (timestamp) embed.setTimestamp(timestamp);

        if (color) embed.setColor(color);

        return embed;
    }

    private async sendLogEmbed(
        guild: Guild,
        options: CreateLogEmbedOptions,
        extraOptions?: MessagePayload | MessageCreateOptions,
        channel?: LoggingChannelType
    ) {
        return await this.send(
            guild,
            {
                embeds: [this.createLogEmbed(options)],
                ...((extraOptions as any) ?? {})
            },
            channel
        );
    }

    async logMessageEdit(oldMessage: Message, newMessage: Message) {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setLabel("Go to context")
                .setURL(`https://discord.com/channels/${newMessage.guildId!}/${newMessage.channelId!}/${newMessage.id}`)
        );

        if (newMessage.type === MessageType.Reply)
            row.addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setLabel("Go to referenced message")
                    .setURL(`https://discord.com/channels/${newMessage.guildId!}/${newMessage.channelId!}/${newMessage.reference!.messageId}`)
            );

        await this.sendLogEmbed(
            newMessage.guild!,
            {
                title: "Message Updated",
                user: newMessage.author,
                color: 0x007bff,
                options: {
                    description: `**-+-+Before**\n${oldMessage.content}\n\n**-+-+After**\n${newMessage.content}`
                },
                fields: [
                    {
                        name: "User",
                        value: `${newMessage.author.toString()}\nUsername: ${newMessage.author.username}\nID: ${newMessage.author.id})`
                    },
                    {
                        name: "Channel",
                        value: `${newMessage.channel.toString()}\nName: ${(newMessage.channel as TextChannel).name}\nID: ${newMessage.channel.id})`
                    },
                    {
                        name: "Message",
                        value: `Link: [Click here](${`https://discord.com/channels/${newMessage.guildId!}/${newMessage.channelId!}/${
                            newMessage.id
                        }`})\nID: ${newMessage.id}`
                    }
                ],
                footerText: "Updated"
            },
            {
                components: [row]
            },
            "message_logging_channel"
        );
    }

    async logMessageDelete(message: Message) {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setLabel("Go to context")
                .setURL(`https://discord.com/channels/${message.guildId!}/${message.channelId!}/${message.id}`)
        );

        if (message.type === MessageType.Reply)
            row.addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setLabel("Go to referenced message")
                    .setURL(`https://discord.com/channels/${message.guildId!}/${message.channelId!}/${message.reference!.messageId}`)
            );

        await this.sendLogEmbed(
            message.guild!,
            {
                title: "Message Deleted",
                color: Colors.Red,
                user: message.author,
                options: {
                    description: message.content
                },
                fields: [
                    {
                        name: "User",
                        value: `${message.author.toString()}\nUsername: ${message.author.username}\nID: ${message.author.id})`
                    },
                    {
                        name: "Channel",
                        value: `${message.channel.toString()}\nName: ${(message.channel as TextChannel).name}\nID: ${message.channel.id})`
                    },
                    {
                        name: "Message",
                        value: `Link: [Click here](${`https://discord.com/channels/${message.guildId!}/${message.channelId!}/${message.id}`})\nID: ${
                            message.id
                        }`
                    }
                ],
                footerText: "Deleted"
            },
            {
                components: [row],
                files: [
                    ...message.attachments
                        .map(
                            a =>
                                ({
                                    attachment: a.proxyURL,
                                    name: a.name
                                } as AttachmentBuilder)
                        )
                        .values()
                ]
            },
            "message_logging_channel"
        );
    }

    async logRaid({ guild, action }: { guild: Guild; action: string }) {
        await this.sendLogEmbed(guild, {
            title: "Possible raid detected",
            reason: "Too many users joined in a short timeframe.",
            color: Colors.Red,
            fields: [
                {
                    name: "Action",
                    value: action
                }
            ],
            footerText: "Raid detected"
        });
    }

    async logServerLockOrUnlock({
        guild,
        action,
        moderator,
        countInvalidChannel,
        countSkipped,
        countFailed,
        countSuccess,
        reason
    }: {
        guild: Guild;
        action: "Locked" | "Unlocked";
        moderator: User;
        countInvalidChannel: number;
        countSkipped: number;
        countFailed: number;
        countSuccess: number;
        reason?: string;
    }) {
        await this.sendLogEmbed(guild, {
            title: `Server ${action.toLowerCase()}`,
            reason: reason ?? "The user ran a command to perform this action",
            moderator,
            color: 0x007bff,
            footerText: action,
            options: {
                description: `Results:\n\n${countInvalidChannel === 0 ? "" : `InvalidChannel: ${countInvalidChannel}\n`}${
                    countSkipped === 0 ? "" : `Skipped: ${countSkipped}\n`
                }${countSuccess === 0 ? "" : `Success: ${countSuccess}\n`}${countFailed === 0 ? "" : `Failed: ${countFailed}\n`}`
            }
        });
    }

    async logChannelLockOrUnlock({
        guild,
        action,
        moderator,
        channel,
        reason
    }: {
        guild: Guild;
        action: "Locked" | "Unlocked";
        moderator: User;
        channel: GuildChannel;
        reason?: string;
    }) {
        await this.sendLogEmbed(guild, {
            title: `Channel ${action.toLowerCase()}`,
            reason: reason ?? "The user ran a command to perform this action",
            moderator,
            color: 0x007bff,
            footerText: action,
            fields: [
                {
                    name: "Channel",
                    value: `${channel.toString()} (${channel.id})`
                }
            ]
        });
    }

    async logUserBan({ moderator, user, deleteMessageSeconds, reason, guild, id, duration }: LogUserBanOptions) {
        await this.sendLogEmbed(guild, {
            user,
            title: "A user was banned",
            footerText: (duration ? "Temporarily " : "") + "Banned",
            reason: reason ?? null,
            moderator,
            id,
            color: Colors.Red,
            fields: [
                {
                    name: "Message Deletion Timeframe",
                    value: deleteMessageSeconds
                        ? formatDistanceToNowStrict(new Date(Date.now() - deleteMessageSeconds * 1000))
                        : "*No timeframe provided*"
                },
                ...(duration
                    ? [
                          {
                              name: "Duration",
                              value: formatDistanceToNowStrict(new Date(Date.now() - duration))
                          }
                      ]
                    : [])
            ]
        });
    }

    async logUserSoftBan({ moderator, user, deleteMessageSeconds, reason, guild, id }: LogUserBanOptions) {
        await this.sendLogEmbed(guild, {
            user,
            title: "A user was softbanned",
            footerText: "Softbanned",
            reason: reason ?? null,
            moderator,
            id,
            color: Colors.Red,
            fields: [
                {
                    name: "Message Deletion Timeframe",
                    value: deleteMessageSeconds
                        ? formatDistanceToNowStrict(new Date(Date.now() - deleteMessageSeconds * 1000))
                        : "*No timeframe provided*"
                }
            ]
        });
    }

    async logUserUnban({ moderator, user, reason, guild, id }: LogUserUnbanOptions) {
        this.sendLogEmbed(guild, {
            user,
            title: "A user was unbanned",
            footerText: "Unbanned",
            reason: reason ?? null,
            moderator,
            id,
            color: Colors.Green
        });
    }

    async logMemberKick({ moderator, member, reason, guild, id }: CommonUserActionOptions & { member: GuildMember; reason?: string }) {
        this.sendLogEmbed(guild, {
            user: member.user,
            title: "A member was kicked",
            footerText: "Kicked",
            reason: reason ?? null,
            moderator,
            id,
            color: Colors.Orange
        });
    }

    async logMemberMute({
        moderator,
        member,
        reason,
        guild,
        id,
        duration
    }: CommonUserActionOptions & { member: GuildMember; reason?: string; duration?: number }) {
        this.sendLogEmbed(guild, {
            user: member.user,
            title: "A member was muted",
            footerText: "Muted",
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

    async logMemberWarning({ moderator, member, reason, guild, id }: CommonUserActionOptions & { member: GuildMember; reason?: string }) {
        this.sendLogEmbed(guild, {
            user: member.user,
            title: "A member was warned",
            footerText: "Warned",
            reason: reason ?? null,
            moderator,
            id,
            color: Colors.Gold
        });
    }

    async logBulkDeleteMessages({
        moderator,
        user,
        reason,
        guild,
        id,
        count,
        channel
    }: Omit<CommonUserActionOptions, "id"> & { user?: User; reason?: string; count: number; channel: TextChannel; id?: string }) {
        this.sendLogEmbed(guild, {
            user,
            title: "Messages deleted in bulk",
            footerText: "Deleted",
            reason: reason ?? null,
            moderator,
            id,
            color: Colors.DarkRed,
            fields: [
                {
                    name: "Deleted Message Count",
                    value: `${count}`
                },
                {
                    name: "Channel",
                    value: `${channel.toString()} (${channel.id})`
                }
            ]
        });
    }

    async logMemberUnmute({ moderator, member, reason, guild, id }: CommonUserActionOptions & { member: GuildMember; reason?: string }) {
        this.sendLogEmbed(guild, {
            user: member.user,
            title: "A member was unmuted",
            footerText: "Unmuted",
            reason: reason ?? null,
            moderator,
            id,
            color: Colors.Green
        });
    }

    async logBlockedWordOrToken({ guild, user, isToken, token, word, content }: BlockedTokenOrWordOptions) {
        this.sendLogEmbed(guild, {
            user,
            title: `Posted blocked ${isToken ? "token" : "word"}(s)`,
            footerText: "AutoMod",
            color: Colors.Yellow,
            fields: [
                {
                    name: isToken ? "Token" : "Word",
                    value: `||${escapeMarkdown((isToken ? token : word)!)}||`
                }
            ],
            options: {
                description: `${content}`
            }
        });
    }

    async logUserMassBan({ users, reason, guild, moderator, deleteMessageSeconds }: LogUserMassBanOptions) {
        await this.sendLogEmbed(guild, {
            title: "A massban was executed",
            footerText: "Banned",
            reason: reason ?? null,
            moderator,
            color: Colors.Red,
            fields: [
                {
                    name: "Message Deletion Timeframe",
                    value: deleteMessageSeconds
                        ? formatDistanceToNowStrict(new Date(Date.now() - deleteMessageSeconds * 1000))
                        : "*No timeframe provided*"
                }
            ],
            options: {
                description: `The following users were banned:\n\n${users.reduce(
                    (acc, user) => acc + (acc === "" ? "" : "\n") + "<@" + user + "> (`" + user + "`)",
                    ""
                )}`
            }
        });
    }

    async logMemberMassKick({ users, reason, guild, moderator }: Omit<LogUserMassBanOptions, "deleteMessageSeconds">) {
        await this.sendLogEmbed(guild, {
            title: "A masskick was executed",
            footerText: "Kicked",
            reason: reason ?? null,
            moderator,
            color: Colors.Orange,
            options: {
                description: `The following users were kicked:\n\n${users.reduce(
                    (acc, user) => acc + (acc === "" ? "" : "\n") + "<@" + user + "> (`" + user + "`)",
                    ""
                )}`
            }
        });
    }
}

interface LogUserBanOptions extends BanOptions, CommonUserActionOptions {
    user: User;
    duration?: number;
}

interface LogUserMassBanOptions extends BanOptions, Omit<CommonUserActionOptions, "id"> {
    users: string[];
}

interface LogUserUnbanOptions extends CommonUserActionOptions {
    user: User;
    reason?: string;
}

interface CommonUserActionOptions {
    moderator: User;
    guild: Guild;
    id: string;
}

interface BlockedTokenOrWordOptions {
    isToken: boolean;
    token?: string;
    word?: string;
    guild: Guild;
    user: User;
    content: string;
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
