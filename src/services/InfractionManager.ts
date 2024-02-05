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

import { Infraction, InfractionType } from "@prisma/client";
import { AlignmentEnum, AsciiTable3 } from "ascii-table3";
import { formatDistanceToNowStrict } from "date-fns";
import {
    APIEmbed,
    APIEmbedField,
    APIUser,
    ChannelType,
    ColorResolvable,
    DiscordAPIError,
    EmbedBuilder,
    EmbedField,
    Guild,
    GuildMember,
    Message,
    MessageResolvable,
    OverwriteData,
    PermissionFlagsBits,
    PrivateThreadChannel,
    TextBasedChannel,
    TextChannel,
    ThreadAutoArchiveDuration,
    User,
    escapeCodeBlock,
    escapeMarkdown,
    time
} from "discord.js";
import path from "path";
import Service from "../core/Service";
import QueueEntry from "../utils/QueueEntry";
import { safeChannelFetch } from "../utils/fetch";
import { log, logError } from "../utils/logger";
import { getEmoji, wait } from "../utils/utils";

export const name = "infractionManager";

export default class InfractionManager extends Service {
    protected readonly multiplier: Record<InfractionType, number> = {
        BAN: 30,
        MASSBAN: 30,
        TEMPBAN: 25,
        KICK: 20,
        MASSKICK: 20,
        BEAN: 0,
        BULK_DELETE_MESSAGE: 1,
        MUTE: 10,
        NOTE: 0,
        SOFTBAN: 20,
        TIMEOUT: 10,
        TIMEOUT_REMOVE: 0,
        UNBAN: 0,
        UNMUTE: 0,
        WARNING: 5
    };

    calculatePoints(infractionCounts: Record<InfractionType, number>) {
        let points = 0;

        for (const type in infractionCounts) {
            points += (infractionCounts[type as InfractionType] ?? 0) * this.multiplier[type as InfractionType];
        }

        return points;
    }

    recommendAction(infractions: Array<{ _count: number; type: InfractionType }>) {
        const infractionCounts = {} as Record<InfractionType, number>;

        for (const { type, _count: count } of infractions) {
            infractionCounts[type] = count;
        }

        for (const key in InfractionType) {
            infractionCounts[key as InfractionType] ??= 0;
        }

        const points = this.calculatePoints(infractionCounts);

        if ((infractionCounts.BAN ?? 0) > 0 || (infractionCounts.MASSBAN ?? 0) > 0) {
            return { action: "Permanent Ban", points };
        }

        if ((infractionCounts.MASSKICK ?? 0) > 0) {
            return { action: "Kick", points };
        }

        if ((infractionCounts.TEMPBAN ?? 0) > 0 && (infractionCounts.TEMPBAN ?? 0) < 3) {
            return { action: `Temporary Ban for **${infractionCounts.TEMPBAN}** days`, points };
        } else if ((infractionCounts.TEMPBAN ?? 0) >= 3) {
            return { action: "Permanent Ban", points };
        }

        if (points >= 60) {
            return { action: "Permanent Ban", points };
        } else if (points >= 50 && points < 60) {
            return { action: `Temporary Ban for **${points - 50 + 1}** days`, points };
        } else if (points >= 45 && points < 50) {
            return { action: `Softban`, points };
        } else if (points >= 40 && points < 45) {
            return { action: `Kick`, points };
        } else if (points >= 20 && points < 40) {
            return {
                action: `Mute for ${
                    points < 30
                        ? `**${points - 20 + 1}** hour${points === 20 ? "" : "s"}`
                        : `**${points - 30 + 1}** days${points === 30 ? "" : "s"}`
                }`,
                points
            };
        } else if (points >= 10 && points < 20) {
            return {
                action: "Manual Warning",
                points
            };
        } else if (points > 0) {
            return {
                action: "Verbal Warning",
                points
            };
        }

        return { action: "None", points };
    }

    summarizeInfractionsGroup(infractions: Array<{ _count: number; type: InfractionType }>) {
        let string = "";
        let totalCount = 0;

        for (const { type, _count: count } of infractions) {
            string += `**${count}** ${type[0]}${type.substring(1).toLowerCase()}${count === 1 ? "" : "s"}, `;
            totalCount += count;
        }

        return string === "" ? "No infractions yet" : `${string}**${totalCount}** total`;
    }

    getInfractionCountsInGroup(userId: string, guildId: string) {
        return this.client.prisma.infraction.groupBy({
            by: "type",
            where: {
                userId,
                guildId
            },
            _count: true
        });
    }

    async getUserStats(userId: string, guildId: string) {
        const infractions = await this.getInfractionCountsInGroup(userId, guildId);
        return {
            summary: this.summarizeInfractionsGroup(infractions),
            ...this.recommendAction(infractions)
        };
    }

    generateInfractionDetailsEmbed(user: User | null, infraction: Infraction) {
        let metadataString = "";

        if (infraction.metadata && typeof infraction.metadata === "object") {
            const entries = Object.entries(infraction.metadata as Record<string, string>);

            if (entries.length > 0) {
                metadataString += "```\n";

                for (const [key, value] of entries) {
                    log(key, value);
                    metadataString += `${key}: ${escapeCodeBlock(`${value}`)}\n`;
                }

                metadataString += "\n```";
            }
        }

        return new EmbedBuilder({
            author: {
                name: user?.username ?? "Unknown User",
                iconURL: user?.displayAvatarURL() ?? undefined
            },
            color: 0x007bff,
            fields: [
                {
                    name: "ID",
                    value: infraction.id.toString(),
                    inline: true
                },
                {
                    name: "Action Type",
                    value:
                        infraction.type === InfractionType.BULK_DELETE_MESSAGE
                            ? "Bulk message delete"
                            : infraction.type[0] + infraction.type.substring(1).toLowerCase(),
                    inline: true
                },
                ...(infraction.queueId
                    ? [
                          {
                              name: "Associated Queue ID",
                              value: infraction.queueId.toString(),
                              inline: true
                          }
                      ]
                    : []),
                {
                    name: "User",
                    value: `${user?.username ?? `<@${infraction.userId}>`} (${infraction.userId})`
                },
                {
                    name: "Responsible Moderator",
                    value: `<@${infraction.moderatorId}> (${infraction.moderatorId})`,
                    inline: true
                },
                {
                    name: "Metadata",
                    value: metadataString === "" ? "*No metadata available*" : metadataString
                },
                {
                    name: "Reason",
                    value: infraction.reason ?? "*No reason provided*"
                },

                {
                    name: "Created At",
                    value: `${infraction.createdAt.toLocaleString()} (${time(infraction.createdAt)})`,
                    inline: true
                },
                {
                    name: "Updated At",
                    value: `${infraction.updatedAt.toLocaleString()} (${time(infraction.updatedAt)})`,
                    inline: true
                },
                ...(infraction.expiresAt
                    ? [
                          {
                              name: `Expire${infraction.expiresAt.getTime() <= Date.now() ? "d" : "s"} At`,
                              value: `${infraction.expiresAt.toLocaleString()} (${time(infraction.expiresAt)})`,
                              inline: true
                          }
                      ]
                    : [])
            ]
        }).setTimestamp();
    }

    private async sendDMBuildEmbed(guild: Guild, options: SendDMOptions) {
        const { fields, description, actionDoneName, id, reason, color, title } = options;

        const internalFields: EmbedField[] = [
            ...(this.client.configManager.config[guild.id]!.infractions?.send_ids_to_user
                ? [
                      {
                          name: "Infraction ID",
                          value: `${id}`,
                          inline: false
                      }
                  ]
                : [])
        ];

        return new EmbedBuilder({
            author: {
                name: actionDoneName ? `You have been ${actionDoneName} in ${guild.name}` : title ?? "",
                iconURL: guild.iconURL() ?? undefined
            },
            description,
            fields: [
                {
                    name: "Reason",
                    value: reason ?? "*No reason provided*"
                },
                ...(fields ? (typeof fields === "function" ? await fields(internalFields) : fields) : []),
                ...(typeof fields === "function" ? [] : internalFields ?? [])
            ]
        })
            .setTimestamp()
            .setColor(color ?? 0x0f14a60);
    }

    private async sendDM(user: User, guild: Guild, options: SendDMOptions) {
        const embed = await this.sendDMBuildEmbed(guild, options);
        const { fallback = false, infraction } = options;

        try {
            await user.send({
                embeds: [embed]
            });

            return true;
        } catch (e) {
            logError(e);

            if (!fallback || !infraction) {
                return false;
            }

            try {
                return await this.notifyUserFallback({ infraction, user, guild, sendDMOptions: options, embed });
            } catch (e) {
                logError(e);
                return false;
            }
        }
    }

    async createUserSoftban(
        user: User,
        {
            guild,
            moderator,
            reason,
            deleteMessageSeconds,
            notifyUser,
            sendLog
        }: CreateUserBanOptions & { deleteMessageSeconds: number }
    ) {
        const { id } = await this.client.prisma.infraction.create({
            data: {
                type: InfractionType.SOFTBAN,
                userId: user.id,
                guildId: guild.id,
                reason,
                moderatorId: moderator.id,
                metadata: {
                    deleteMessageSeconds
                }
            }
        });

        if (sendLog)
            this.client.logger.logUserSoftBan({
                moderator,
                guild,
                id: `${id}`,
                user,
                deleteMessageSeconds,
                reason
            });

        if (notifyUser) {
            await this.sendDM(user, guild, {
                id,
                actionDoneName: "softbanned",
                reason
            });
        }

        try {
            await guild.bans.create(user, {
                reason,
                deleteMessageSeconds
            });

            log("Seconds: " + deleteMessageSeconds);

            await wait(1500);
            await guild.bans.remove(user, `Softban remove: ${reason}`);
            return id;
        } catch (e) {
            logError(e);
            return null;
        }
    }

    async createUserBan(
        user: User,
        { guild, moderator, reason, deleteMessageSeconds, notifyUser, duration, sendLog, autoRemoveQueue }: CreateUserBanOptions
    ) {
        const { id } = await this.client.prisma.infraction.create({
            data: {
                type: duration ? InfractionType.TEMPBAN : InfractionType.BAN,
                userId: user.id,
                guildId: guild.id,
                reason,
                moderatorId: moderator.id,
                metadata: {
                    deleteMessageSeconds,
                    duration
                }
            }
        });

        if (autoRemoveQueue) {
            log("Auto remove", this.client.queueManager.queues);
            await this.autoRemoveUnbanQueue(guild, user).catch(logError);
        }

        if (sendLog)
            this.client.logger.logUserBan({
                moderator,
                guild,
                id: `${id}`,
                user,
                deleteMessageSeconds,
                reason,
                duration
            });

        if (notifyUser) {
            await this.sendDM(user, guild, {
                id,
                actionDoneName: "banned",
                reason,
                fields: duration
                    ? [
                          {
                              name: "Duration",
                              value: formatDistanceToNowStrict(new Date(Date.now() - duration))
                          }
                      ]
                    : undefined
            }).catch(logError);
        }

        try {
            await guild.bans.create(user, {
                reason,
                deleteMessageSeconds
            });

            log("Seconds: " + deleteMessageSeconds);

            if (duration) {
                log("Added unban queue");

                await this.client.queueManager.add(
                    new QueueEntry({
                        args: [user.id],
                        client: this.client,
                        filePath: path.resolve(__dirname, "../queues/UnbanQueue"),
                        guild,
                        name: "UnbanQueue",
                        createdAt: new Date(),
                        userId: user.id,
                        willRunAt: new Date(Date.now() + duration)
                    })
                );
            }

            return id;
        } catch (e) {
            logError(e);
            await this.autoRemoveUnbanQueue(guild, user).catch(logError);
            return null;
        }
    }

    async createUserFakeBan(user: User, { guild, reason, notifyUser, duration }: CreateUserBanOptions) {
        const id = Math.round(Math.random() * 1000);

        if (notifyUser) {
            await this.sendDM(user, guild, {
                id,
                actionDoneName: "banned",
                reason,
                fields: duration
                    ? [
                          {
                              name: "Duration",
                              value: formatDistanceToNowStrict(new Date(Date.now() - duration))
                          }
                      ]
                    : undefined
            });
        }

        return id;
    }

    async createUserShot(user: User, { guild, reason, moderator }: Omit<CommonOptions, "notifyUser" | "sendLog">) {
        const id = Math.round(Math.random() * 1000);

        await this.sendDM(user, guild, {
            title: `You have gotten a shot in ${guild.name}`,
            id,
            reason,
            fields: [
                {
                    name: `💉 Doctor`,
                    value: `${moderator.username}`
                }
            ],
            color: 0x007bff
        });

        return id;
    }

    async createUserBean(user: User, { guild, moderator, reason }: Pick<CreateUserBanOptions, "guild" | "moderator" | "reason">) {
        const { id } = await this.client.prisma.infraction.create({
            data: {
                type: InfractionType.BEAN,
                userId: user.id,
                guildId: guild.id,
                reason,
                moderatorId: moderator.id
            }
        });

        await this.sendDM(user, guild, {
            id,
            actionDoneName: "beaned",
            reason,
            color: 0x007bff
        });

        return id;
    }

    private async autoRemoveUnbanQueue(guild: Guild, user: User) {
        log("Auto remove", this.client.queueManager.queues);

        for (const queue of this.client.queueManager.queues.values()) {
            if (queue.options.name === "UnbanQueue" && queue.options.guild.id === guild.id && queue.options.args[0] === user.id) {
                await this.client.queueManager.remove(queue);
            }
        }
    }

    async removeUserBan(
        user: User,
        { guild, moderator, reason, autoRemoveQueue = true, sendLog }: CommonOptions & { autoRemoveQueue?: boolean }
    ) {
        if (autoRemoveQueue) await this.autoRemoveUnbanQueue(guild, user);

        try {
            await guild.bans.remove(user);
        } catch (error) {
            logError(error);
            return { error, noSuchBan: error instanceof DiscordAPIError && error.code === 10026 && error.status === 404 };
        }

        const { id } = await this.client.prisma.infraction.create({
            data: {
                type: InfractionType.UNBAN,
                userId: user.id,
                guildId: guild.id,
                reason,
                moderatorId: moderator.id
            }
        });

        if (sendLog)
            this.client.logger.logUserUnban({
                moderator,
                guild,
                id: `${id}`,
                user,
                reason
            });

        return { id };
    }

    async createMemberKick(member: GuildMember, { guild, moderator, reason, notifyUser }: CommonOptions) {
        if (!member.kickable) return null;

        const { id } = await this.client.prisma.infraction.create({
            data: {
                type: InfractionType.KICK,
                userId: member.user.id,
                guildId: guild.id,
                reason,
                moderatorId: moderator.id
            }
        });

        this.client.logger.logMemberKick({
            moderator,
            guild,
            id: `${id}`,
            member,
            reason
        });

        if (notifyUser) {
            await this.sendDM(member.user, guild, {
                id,
                actionDoneName: "kicked",
                reason
            });
        }

        try {
            await member.kick(reason);
            return id;
        } catch (e) {
            logError(e);
            return null;
        }
    }

    async createMemberWarn(member: GuildMember, { guild, moderator, reason, notifyUser }: CommonOptions) {
        const infraction = await this.client.prisma.infraction.create({
            data: {
                type: InfractionType.WARNING,
                userId: member.user.id,
                guildId: guild.id,
                reason,
                moderatorId: moderator.id
            }
        });
        const { id } = infraction;

        this.client.logger.logMemberWarning({
            moderator,
            member,
            guild,
            id: `${id}`,
            reason
        });

        let result: boolean | null = false;

        if (notifyUser) {
            result = await this.sendDM(member.user, guild, {
                id,
                actionDoneName: "warned",
                reason,
                fallback: true,
                infraction
            });
        }

        return { id, result };
    }

    bulkDeleteMessagesApplyFilters(message: Message, filters: Function[]) {
        for (const filter of filters) {
            if (!filter(message)) {
                return false;
            }
        }

        return true;
    }

    async bulkDeleteMessages({
        user,
        messagesToDelete,
        messageChannel,
        guild,
        moderator,
        reason,
        sendLog,
        count: messageCount,
        logOnly = false,
        filters = [],
        offset = 0
    }: BulkDeleteMessagesOptions) {
        if (messageChannel && !(messagesToDelete && messagesToDelete.length === 0)) {
            let messages: MessageResolvable[] | null = messagesToDelete ?? null;

            if (!logOnly && messages === null) {
                log("The messagesToDelete was option not provided. Fetching messages manually.");

                try {
                    const allMessages = await messageChannel.messages.fetch({ limit: 100 });
                    messages = [];

                    let i = 0;

                    for (const [, m] of allMessages) {
                        if (i < offset) {
                            i++;
                            continue;
                        }

                        if (messageCount && i >= messageCount) {
                            break;
                        }

                        if (
                            (user ? m.author.id === user.id : true) &&
                            Date.now() - m.createdAt.getTime() <= 1000 * 60 * 60 * 24 * 7 * 2 &&
                            this.bulkDeleteMessagesApplyFilters(m, filters)
                        ) {
                            messages.push(m);
                            i++;
                        }
                    }
                } catch (e) {
                    logError(e);
                    messages = null;
                }
            }

            const count = messages ? messages.length : 0;

            const { id } = user
                ? await this.client.prisma.infraction.create({
                      data: {
                          type: InfractionType.BULK_DELETE_MESSAGE,
                          guildId: guild.id,
                          moderatorId: moderator.id,
                          userId: user.id,
                          metadata: {
                              count
                          },
                          reason
                      }
                  })
                : { id: 0 };

            if (
                sendLog &&
                this.client.configManager.config[messageChannel.guildId!]?.logging?.enabled &&
                this.client.configManager.config[messageChannel.guildId!]?.logging?.events.message_bulk_delete
            ) {
                this.client.logger
                    .logBulkDeleteMessages({
                        channel: messageChannel,
                        count,
                        guild,
                        id: id === 0 ? undefined : `${id}`,
                        user,
                        moderator,
                        reason,
                        messages: messages ?? []
                    })
                    .catch(logError);
            }

            if (!logOnly && messages) {
                try {
                    await messageChannel.bulkDelete(messages);
                    const reply = await messageChannel.send(
                        `${getEmoji(this.client, "check")} Deleted ${messages.length} messages${
                            user ? ` from user **@${escapeMarkdown(user.username)}**` : ""
                        }`
                    );

                    setTimeout(() => reply.delete().catch(logError), 5000);
                    return true;
                } catch (e) {
                    logError(e);
                }
            }

            return false;
        }
    }

    async createMemberMute(
        member: GuildMember,
        {
            guild,
            moderator,
            reason,
            notifyUser,
            duration,
            messagesToDelete,
            messageChannel,
            bulkDeleteReason,
            sendLog,
            autoRemoveQueue
        }: CreateMemberMuteOptions
    ) {
        const mutedRole = this.client.configManager.config[guild.id]?.muting?.role;

        if (!mutedRole) {
            if (!duration) {
                return {
                    error: "Muted role is not configured and duration wasn't provided, please set the muted role to perform this operation."
                };
            }

            try {
                await member.disableCommunicationUntil(new Date(Date.now() + duration), reason);
            } catch (e) {
                logError(e);
                return { error: "Failed to timeout user, make sure I have enough permissions!" };
            }
        } else {
            try {
                await member.roles.add(mutedRole);
            } catch (e) {
                logError(e);
                return {
                    error: "Failed to assign the muted role to this user. Make sure that I have enough permissions to do it."
                };
            }
        }

        if (autoRemoveQueue) {
            log("Auto remove", this.client.queueManager.queues);

            for (const queue of this.client.queueManager.queues.values()) {
                if (
                    queue.options.name === "UnmuteQueue" &&
                    queue.options.guild.id === member.guild.id &&
                    queue.options.args[0] === member.user.id
                ) {
                    log("Called");
                    await this.client.queueManager.remove(queue);
                }
            }
        }

        let queueId: number | undefined;

        if (duration) {
            queueId = await this.client.queueManager.add(
                new QueueEntry({
                    args: [member.user.id],
                    guild,
                    client: this.client,
                    createdAt: new Date(),
                    filePath: path.resolve(__dirname, "../queues/UnmuteQueue"),
                    name: "UnmuteQueue",
                    userId: moderator.id,
                    willRunAt: new Date(Date.now() + duration)
                })
            );
        }

        const infraction = await this.client.prisma.infraction.create({
            data: {
                type: InfractionType.MUTE,
                userId: member.user.id,
                guildId: guild.id,
                reason,
                moderatorId: moderator.id,
                expiresAt: duration ? new Date(Date.now() + duration) : undefined,
                queueId,
                metadata: duration ? { duration } : undefined
            }
        });

        const { id } = infraction;

        if (sendLog) {
            this.client.logger.logMemberMute({
                moderator,
                member,
                guild,
                id: `${id}`,
                duration,
                reason
            });
        }

        if (messageChannel && !(messagesToDelete && messagesToDelete.length === 0)) {
            this.bulkDeleteMessages({
                user: member.user,
                guild,
                moderator,
                messagesToDelete,
                messageChannel,
                sendLog: true,
                notifyUser: false,
                reason:
                    bulkDeleteReason ??
                    `This user was muted with delete messages option specified. The mute reason was: ${
                        reason ?? "*No reason provided*"
                    }`
            }).catch(logError);
        }

        let result: boolean | null = !notifyUser;

        if (notifyUser) {
            result = await this.sendDM(member.user, guild, {
                id,
                actionDoneName: "muted",
                reason,
                fields: [
                    {
                        name: "Duration",
                        value: `${duration ? formatDistanceToNowStrict(new Date(Date.now() - duration)) : "*No duration set*"}`
                    }
                ],
                fallback: true,
                infraction
            });
        }

        return { id, result };
    }

    async removeMemberMute(
        member: GuildMember,
        { guild, moderator, reason, notifyUser, sendLog, autoRemoveQueue = true }: CommonOptions & { autoRemoveQueue?: boolean }
    ): Promise<{ error?: string; result?: boolean | null; id?: number }> {
        const mutedRole = this.client.configManager.config[guild.id]?.muting?.role;

        if (!mutedRole) {
            if (!member.isCommunicationDisabled()) {
                return { error: "This user is not muted" };
            }

            try {
                await member.disableCommunicationUntil(null, reason);
            } catch (e) {
                logError(e);
                return { error: "Failed to remove timeout from user, make sure I have enough permissions!" };
            }
        } else {
            try {
                await member.roles.remove(mutedRole);
            } catch (e) {
                logError(e);
                return {
                    error: "Failed to remove the muted role to this user. Make sure that I have enough permissions to do it."
                };
            }
        }

        const { id } = await this.client.prisma.infraction.create({
            data: {
                type: InfractionType.UNMUTE,
                userId: member.user.id,
                guildId: guild.id,
                reason,
                moderatorId: moderator.id
            }
        });

        if (sendLog) {
            this.client.logger.logMemberUnmute({
                moderator,
                member,
                guild,
                id: `${id}`,
                reason
            });
        }

        let result: boolean | null = !notifyUser;

        if (notifyUser) {
            result = await this.sendDM(member.user, guild, {
                id,
                actionDoneName: "unmuted",
                reason,
                color: "Green"
            });
        }

        if (autoRemoveQueue) {
            log("Auto remove", this.client.queueManager.queues);

            for (const queue of this.client.queueManager.queues.values()) {
                if (
                    queue.options.name === "UnmuteQueue" &&
                    queue.options.guild.id === member.guild.id &&
                    queue.options.args[0] === member.user.id
                ) {
                    log("Called");
                    await this.client.queueManager.remove(queue);
                }
            }
        }

        return { id, result };
    }

    async createUserMassBan({
        users,
        sendLog,
        reason,
        deleteMessageSeconds,
        moderator,
        guild,
        callAfterEach,
        callback
    }: CreateUserMassBanOptions) {
        if (users.length > 20) {
            return { error: "Cannot perform this operation on more than 20 users" };
        }

        const startTime = Date.now();

        const createInfractionData = [];
        const skippedUsers: string[] = [];
        const completedUsers: string[] = [];
        let count = 0;
        let calledJustNow = false;

        if (callback) {
            await callback({
                count,
                users,
                completedUsers,
                skippedUsers
            }).catch(logError);
        }

        for (const user of users) {
            if (callAfterEach && callback && count !== 0 && count % callAfterEach === 0) {
                await callback({
                    count,
                    users,
                    completedUsers,
                    skippedUsers
                }).catch(logError);

                calledJustNow = true;
            } else calledJustNow = false;

            try {
                await guild.bans.create(user, {
                    reason,
                    deleteMessageSeconds
                });

                completedUsers.push(user);

                createInfractionData.push({
                    type: InfractionType.MASSBAN,
                    userId: user,
                    reason,
                    moderatorId: moderator.id,
                    guildId: guild.id,
                    metadata: {
                        deleteMessageSeconds
                    }
                });
            } catch (e) {
                logError(e);
                skippedUsers.push(user);
            }

            count++;
        }

        if (!calledJustNow && callback) {
            await callback({
                count,
                users,
                completedUsers,
                skippedUsers,
                completedIn: Math.round((Date.now() - startTime) / 1000)
            }).catch(logError);
        }

        await this.client.prisma.infraction.createMany({
            data: createInfractionData
        });

        if (sendLog)
            await this.client.logger.logUserMassBan({
                users: completedUsers,
                reason,
                guild,
                moderator,
                deleteMessageSeconds
            });

        return { success: true };
    }

    async createMemberMassKick({
        users,
        sendLog,
        reason,
        moderator,
        guild,
        callAfterEach,
        callback
    }: Omit<CreateUserMassBanOptions, "deleteMessageSeconds">) {
        if (users.length > 10) {
            return { error: "Cannot perform this operation on more than 10 users" };
        }

        const startTime = Date.now();

        const createInfractionData = [];
        const skippedUsers: string[] = [];
        const completedUsers: string[] = [];
        let count = 0;
        let calledJustNow = false;

        if (callback) {
            await callback({
                count,
                users,
                completedUsers,
                skippedUsers
            }).catch(logError);
        }

        for (const user of users) {
            if (callAfterEach && callback && count !== 0 && count % callAfterEach === 0) {
                await callback({
                    count,
                    users,
                    completedUsers,
                    skippedUsers
                }).catch(logError);

                calledJustNow = true;
            } else calledJustNow = false;

            try {
                const member = guild.members.cache.get(user) ?? (await guild.members.fetch(user));
                await member.kick(reason);

                completedUsers.push(user);

                createInfractionData.push({
                    type: InfractionType.MASSKICK,
                    userId: user,
                    reason,
                    moderatorId: moderator.id,
                    guildId: guild.id
                });
            } catch (e) {
                logError(e);
                skippedUsers.push(user);
            }

            count++;
        }

        if (!calledJustNow && callback) {
            await callback({
                count,
                users,
                completedUsers,
                skippedUsers,
                completedIn: Math.round((Date.now() - startTime) / 1000)
            }).catch(logError);
        }

        await this.client.prisma.infraction.createMany({
            data: createInfractionData
        });

        if (sendLog)
            await this.client.logger.logUserMassBan({
                users: completedUsers,
                reason,
                guild,
                moderator
            });

        return { success: true };
    }

    async createInfractionHistoryBuffer(user: User | APIUser, guild: Guild) {
        const infractions = await this.client.prisma.infraction.findMany({
            where: {
                userId: user.id,
                guildId: guild.id
            }
        });

        if (infractions.length === 0) {
            return { buffer: null, count: 0 };
        }

        let fileContents = `*** Infraction History ***\nUser: @${user.username} (${user.id})\nServer: ${guild.name} (${guild.id})\n`;

        fileContents += `Generated By: SudoBot/${this.client.metadata.data.version}\n`;
        fileContents += `Total Records: ${infractions.length}\n\n`;

        const table = new AsciiTable3("Infractions");
        const fields = ["Type", "Reason", "Date", "Duration"];

        if (this.client.configManager.config[guild.id]?.infractions?.send_ids_to_user) {
            fields.unshift("ID");
        }

        table.setHeading(...fields);
        table.setAlign(3, AlignmentEnum.CENTER);
        table.addRowMatrix(
            infractions.map(infraction => {
                const row: any[] = [
                    infraction.type,
                    infraction.reason ?? "*No reason provided*",
                    `${infraction.createdAt.toUTCString()} (${formatDistanceToNowStrict(infraction.createdAt, {
                        addSuffix: true
                    })})    `,
                    (infraction.metadata as any)?.duration
                        ? formatDistanceToNowStrict(new Date(Date.now() - (infraction.metadata as any)?.duration))
                        : "*None*"
                ];

                if (this.client.configManager.config[guild.id]?.infractions?.send_ids_to_user) {
                    row.unshift(infraction.id);
                }

                return row;
            })
        );

        fileContents += table.toString();
        fileContents += "\n\n";
        fileContents += `Seeing something unexpected? Contact the staff of ${guild.name}.\n`;

        return { buffer: Buffer.from(fileContents), count: infractions.length };
    }

    private async notifyUserFallback({ infraction, user, guild, sendDMOptions, embed }: NotifyUserFallbackOptions) {
        const channelId = this.client.configManager.config[guild.id]?.infractions?.dm_fallback_parent_channel;
        const fallbackMode = this.client.configManager.config[guild.id]?.infractions?.dm_fallback ?? "none";

        if (!channelId || fallbackMode === "none") {
            return false;
        }

        const channel = await safeChannelFetch(guild, channelId);

        if (
            !channel ||
            (fallbackMode === "create_channel" && channel.type !== ChannelType.GuildCategory) ||
            (fallbackMode === "create_thread" && (!channel.isTextBased() || channel.isThread()))
        ) {
            return false;
        }

        if (fallbackMode === "create_channel") {
            return this.notifyUserInPrivateChannel({
                infraction,
                user,
                parentChannel: channel as TextChannel,
                sendDMOptions,
                embed
            });
        } else if (fallbackMode === "create_thread") {
            return this.notifyUserInPrivateThread({
                infraction,
                user,
                channel: channel as TextChannel,
                sendDMOptions,
                embed
            });
        }

        return true;
    }

    private async sendDMEmbedToChannel(
        channel: TextBasedChannel | PrivateThreadChannel,
        embed: EmbedBuilder,
        actionDoneName: ActionDoneName | undefined,
        user: User
    ) {
        const apiEmbed = embed.toJSON();

        const finalEmbed = {
            ...apiEmbed,
            author: {
                ...apiEmbed.author,
                name: `You have been ${actionDoneName ?? "given an infraction"}`
            }
        } satisfies APIEmbed;

        return await channel.send({
            content: user.toString(),
            embeds: [finalEmbed]
        });
    }

    private async notifyUserInPrivateChannel({
        infraction,
        parentChannel,
        user,
        sendDMOptions: { actionDoneName },
        embed
    }: Omit<NotifyUserFallbackOptions, "guild"> & { parentChannel: TextChannel }) {
        try {
            const expiresIn =
                this.client.configManager.config[parentChannel.guild.id]?.infractions?.dm_fallback_channel_expires_in;

            const channel = await parentChannel.guild.channels.create({
                name: `infraction-${infraction.id}`,
                type: ChannelType.GuildText,
                parent: parentChannel.id,
                reason: "Creating fallback channel to notify the user about their infraction",
                permissionOverwrites: [
                    ...parentChannel.permissionOverwrites.cache.values(),
                    {
                        id: user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
                    }
                ] satisfies OverwriteData[]
            });

            await this.sendDMEmbedToChannel(channel, embed, actionDoneName, user);

            if (expiresIn) {
                await this.client.queueManager.add(
                    new QueueEntry({
                        args: [channel.id],
                        client: this.client,
                        createdAt: new Date(),
                        filePath: path.resolve(__dirname, "../queues/ChannelDeleteQueue"),
                        guild: parentChannel.guild,
                        name: "ChannelDeleteQueue",
                        userId: this.client.user!.id,
                        willRunAt: new Date(Date.now() + expiresIn)
                    })
                );
            }
        } catch (e) {
            logError(e);
            return false;
        }

        return true;
    }

    private async notifyUserInPrivateThread({
        infraction,
        channel,
        user,
        sendDMOptions: { actionDoneName },
        embed
    }: Omit<NotifyUserFallbackOptions, "guild"> & { channel: TextChannel }) {
        try {
            const thread = (await channel.threads.create({
                name: `Infraction #${infraction.id}`,
                autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
                type: ChannelType.PrivateThread,
                reason: "Creating fallback thread to notify the user about their infraction"
            })) as PrivateThreadChannel;

            await thread.members.add(user, "Adding the target user");

            await this.sendDMEmbedToChannel(thread, embed, actionDoneName, user);
        } catch (e) {
            logError(e);
            return false;
        }

        return true;
    }
}

interface NotifyUserFallbackOptions {
    infraction: Infraction;
    user: User;
    guild: Guild;
    sendDMOptions: SendDMOptions;
    embed: EmbedBuilder;
}

export type CreateUserMassBanOptions = Omit<
    CreateUserBanOptions & {
        users: readonly string[];
        callback?: (options: {
            count: number;
            users: readonly string[];
            completedUsers: readonly string[];
            skippedUsers: readonly string[];
            completedIn?: number;
        }) => Promise<any> | any;
        callAfterEach?: number;
    },
    "duration" | "autoRemoveQueue" | "notifyUser"
>;

export type CommonOptions = {
    reason?: string;
    guild: Guild;
    moderator: User;
    notifyUser?: boolean;
    sendLog?: boolean;
};

export type CreateUserBanOptions = CommonOptions & {
    deleteMessageSeconds?: number;
    duration?: number;
    autoRemoveQueue?: boolean;
};

export type CreateMemberMuteOptions = CommonOptions & {
    duration?: number;
    messagesToDelete?: MessageResolvable[];
    messageChannel?: TextChannel;
    bulkDeleteReason?: string;
    autoRemoveQueue?: boolean;
};

export type BulkDeleteMessagesOptions = CommonOptions & {
    user?: User;
    messagesToDelete?: MessageResolvable[];
    messageChannel?: TextChannel;
    count?: number;
    offset?: number;
    logOnly?: boolean;
    filters?: Function[];
};

export type ActionDoneName = "banned" | "muted" | "kicked" | "warned" | "unbanned" | "unmuted" | "softbanned" | "beaned";

export type SendDMOptions = {
    fields?: APIEmbedField[] | ((internalFields: APIEmbedField[]) => Promise<APIEmbedField[]> | APIEmbedField[]);
    description?: string;
    actionDoneName?: ActionDoneName;
    id: string | number;
    reason?: string;
    color?: ColorResolvable;
    title?: string;
    fallback?: boolean;
    infraction?: Infraction;
};
