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

import { Infraction, InfractionType, Prisma } from "@prisma/client";
import { formatDistanceToNowStrict } from "date-fns";
import {
    APIEmbedField,
    Collection,
    ColorResolvable,
    EmbedBuilder,
    EmbedField,
    Guild,
    GuildMember,
    Message,
    MessageResolvable,
    TextChannel,
    User,
    escapeCodeBlock,
    escapeMarkdown,
    time, UserResolvable
} from "discord.js";
import path from "path";
import Service from "../core/Service";
import QueueEntry from "../utils/QueueEntry";
import { log, logError } from "../utils/logger";
import { getEmoji, wait } from "../utils/utils";

export const name = "infractionManager";

export default class InfractionManager extends Service {
    generateInfractionDetailsEmbed(user: User | null, infraction: Infraction) {
        let metadataString = "";

        if (infraction.metadata && typeof infraction.metadata === "object") {
            metadataString += "```\n";

            for (const [key, value] of Object.entries(infraction.metadata as Record<string, string>)) {
                log(key, value);
                metadataString += `${key}: ${escapeCodeBlock(`${value}`)}\n`;
            }

            metadataString += "\n```";
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

    private async sendDM(user: User, guild: Guild, { fields, description, actionDoneName, id, reason, color }: SendDMOptions) {
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

        try {
            await user.send({
                embeds: [
                    new EmbedBuilder({
                        author: {
                            name: `You have been ${actionDoneName} in ${guild.name}`,
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
                        .setColor(color ?? 0x0f14a60)
                ]
            });

            return true;
        } catch (e) {
            logError(e);
            return false;
        }
    }

    async createUserBan(user: User, {
        guild,
        moderator,
        reason,
        deleteMessageSeconds,
        notifyUser,
        duration,
        sendLog,
        autoRemoveQueue
    }: CreateUserBanOptions) {
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
                fields: duration ? [
                    {
                        name: "Duration",
                        value: formatDistanceToNowStrict(new Date(Date.now() - duration))
                    }
                ] : undefined
            });
        }

        try {
            await guild.bans.create(user, {
                reason,
                deleteMessageSeconds
            });

            log("Seconds: " + deleteMessageSeconds);

            if (duration) {
                log("Added unban queue");

                await this.client.queueManager.add(new QueueEntry({
                    args: [user.id],
                    client: this.client,
                    filePath: path.resolve(__dirname, "../queues/UnbanQueue"),
                    guild,
                    name: "UnbanQueue",
                    createdAt: new Date(),
                    userId: user.id,
                    willRunAt: new Date(Date.now() + duration),
                }));
            }

            return id;
        } catch (e) {
            logError(e);
            await this.autoRemoveUnbanQueue(guild, user).catch(logError);
            return null;
        }
    }

    private async autoRemoveUnbanQueue(guild: Guild, user: User) {
        log("Auto remove", this.client.queueManager.queues);

        for (const queue of this.client.queueManager.queues.values()) {
            if (queue.options.name === "UnbanQueue" && queue.options.guild.id === guild.id && queue.options.args[0] === user.id) {
                await this.client.queueManager.remove(queue);
            }
        }
    }

    async removeUserBan(user: User, { guild, moderator, reason, autoRemoveQueue = true, sendLog }: CommonOptions & { autoRemoveQueue?: boolean }) {
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

        if (autoRemoveQueue)
            await this.autoRemoveUnbanQueue(guild, user);

        try {
            await guild.bans.remove(user);
            return id;
        } catch (e) {
            logError(e);
            return null;
        }
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
        const { id } = await this.client.prisma.infraction.create({
            data: {
                type: InfractionType.WARNING,
                userId: member.user.id,
                guildId: guild.id,
                reason,
                moderatorId: moderator.id
            }
        });

        this.client.logger.logMemberWarning({
            moderator,
            member,
            guild,
            id: `${id}`,
            reason
        });

        let result = false;

        if (notifyUser) {
            result = await this.sendDM(member.user, guild, {
                id,
                actionDoneName: "warned",
                reason
            });
        }

        return { id, result };
    }

    async bulkDeleteMessages({ user, messagesToDelete, messageChannel, guild, moderator, reason, sendLog }: BulkDeleteMessagesOptions) {
        if (messageChannel && !(messagesToDelete && messagesToDelete.length === 0)) {
            let messages: Collection<string, Message> | MessageResolvable[] | null = messagesToDelete ?? null;

            if (messages === null) {
                log("The messagesToDelete was option not provided. Fetching messages manually.");

                try {
                    messages = await messageChannel.messages.fetch({ limit: 100 });
                    messages = messages.filter((m) => m.author.id === user.id && Date.now() - m.createdAt.getTime() <= 1000 * 60 * 60 * 24 * 7 * 2);
                } catch (e) {
                    logError(e);
                    messages = null;
                }
            }

            const count = messages ? (messages instanceof Collection ? messages.size : messages.length) : 0;

            const { id } = await this.client.prisma.infraction.create({
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
            });

            if (sendLog) {
                this.client.logger
                    .logBulkDeleteMessages({
                        channel: messageChannel,
                        count,
                        guild,
                        id: `${id}`,
                        user,
                        moderator,
                        reason
                    })
                    .catch(logError);
            }

            if (messages && count > 0) {
                try {
                    await messageChannel.bulkDelete(messages);
                    const reply = await messageChannel.send(
                        `${getEmoji(this.client, "check")} Deleted ${count} messages from user **@${escapeMarkdown(user.username)}**`
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
            return { error: "Muted role is not configured, please set the muted role to perform this operation." };
        }

        try {
            await member.roles.add(mutedRole);
        } catch (e) {
            logError(e);
            return { error: "Failed to assign the muted role to this user. Make sure that I have enough permissions to do it." };
        }

        if (autoRemoveQueue) {
            log("Auto remove", this.client.queueManager.queues);

            for (const queue of this.client.queueManager.queues.values()) {
                if (queue.options.name === "UnmuteQueue" && queue.options.guild.id === member.guild.id && queue.options.args[0] === member.user.id) {
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

        const { id } = await this.client.prisma.infraction.create({
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
                `This user was muted with delete messages option specified. The mute reason was: ${reason ?? "*No reason provided*"}`
        }).catch(logError);

        let result = !notifyUser;

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
                ]
            });
        }

        return { id, result };
    }

    async removeMemberMute(
        member: GuildMember,
        { guild, moderator, reason, notifyUser }: CommonOptions
    ): Promise<{ error?: string; result?: boolean; id?: number }> {
        const mutedRole = this.client.configManager.config[guild.id]?.muting?.role;

        if (!mutedRole) {
            return { error: "Muted role is not configured, please set the muted role to perform this operation." };
        }

        try {
            await member.roles.remove(mutedRole);
        } catch (e) {
            logError(e);
            return { error: "Failed to remove the muted role to this user. Make sure that I have enough permissions to do it." };
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

        this.client.logger.logMemberUnmute({
            moderator,
            member,
            guild,
            id: `${id}`,
            reason
        });

        let result = !notifyUser;

        if (notifyUser) {
            result = await this.sendDM(member.user, guild, {
                id,
                actionDoneName: "unmuted",
                reason,
                color: "Green"
            });
        }

        return { id, result };
    }

    async createUserMassBan({ users, sendLog, reason, deleteMessageSeconds, moderator, guild, callAfterEach, callback }: CreateUserMassBanOptions) {
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
            }
            else
                calledJustNow = false;

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
            }
            catch (e) {
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
            data: createInfractionData,
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

    async createMemberMassKick({ users, sendLog, reason, moderator, guild, callAfterEach, callback }: Omit<CreateUserMassBanOptions, 'deleteMessageSeconds'>) {
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
            }
            else
                calledJustNow = false;

            try {
                const member = guild.members.cache.get(user) ?? await guild.members.fetch(user);
                await member.kick(reason);

                completedUsers.push(user);

                createInfractionData.push({
                    type: InfractionType.MASSKICK,
                    userId: user,
                    reason,
                    moderatorId: moderator.id,
                    guildId: guild.id,
                });
            }
            catch (e) {
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
            data: createInfractionData,
        });

        if (sendLog)
            await this.client.logger.logUserMassBan({
                users: completedUsers,
                reason,
                guild,
                moderator,
            });

        return { success: true };
    }
}

export type CreateUserMassBanOptions = Omit<CreateUserBanOptions & {
    users: readonly string[],
    callback?: (options: {
        count: number,
        users: readonly string[],
        completedUsers: readonly string[],
        skippedUsers: readonly string[],
        completedIn?: number
    }) => Promise<any> | any,
    callAfterEach?: number
}, "duration" | "autoRemoveQueue" | "notifyUser">;

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
    user: User;
    messagesToDelete?: MessageResolvable[];
    messageChannel?: TextChannel;
};

export type ActionDoneName = "banned" | "muted" | "kicked" | "warned" | "unbanned" | "unmuted";

export type SendDMOptions = {
    fields?: APIEmbedField[] | ((internalFields: APIEmbedField[]) => Promise<APIEmbedField[]> | APIEmbedField[]);
    description?: string;
    actionDoneName: ActionDoneName;
    id: string | number;
    reason?: string;
    color?: ColorResolvable;
};