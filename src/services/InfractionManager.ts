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

import { Infraction } from "@prisma/client";
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
    time
} from "discord.js";
import path from "path";
import Service from "../core/Service";
import QueueEntry from "../utils/QueueEntry";
import { log, logError } from "../utils/logger";
import { getEmoji } from "../utils/utils";

export type CommonOptions = {
    reason?: string;
    guild: Guild;
    moderator: User;
    notifyUser?: boolean;
    sendLog?: boolean;
};

export type CreateUserBanOptions = CommonOptions & {
    deleteMessageSeconds?: number;
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
                        infraction.type === "BULKDELETEMSG" ? "Bulk message delete" : infraction.type[0] + infraction.type.substring(1).toLowerCase(),
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

    async createUserBan(user: User, { guild, moderator, reason, deleteMessageSeconds, notifyUser }: CreateUserBanOptions) {
        const { id } = await this.client.prisma.infraction.create({
            data: {
                type: "BAN",
                userId: user.id,
                guildId: guild.id,
                reason,
                moderatorId: moderator.id,
                metadata: {
                    deleteMessageSeconds
                }
            }
        });

        this.client.logger.logUserBan({
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
                actionDoneName: "banned",
                reason
            });
        }

        try {
            await guild.bans.create(user, {
                reason,
                deleteMessageSeconds
            });

            return id;
        } catch (e) {
            logError(e);
            return null;
        }
    }

    async removeUserBan(user: User, { guild, moderator, reason }: CommonOptions & { user: User }) {
        const { id } = await this.client.prisma.infraction.create({
            data: {
                type: "UNBAN",
                userId: user.id,
                guildId: guild.id,
                reason,
                moderatorId: moderator.id
            }
        });

        this.client.logger.logUserUnban({
            moderator,
            guild,
            id: `${id}`,
            user,
            reason
        });

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
                type: "KICK",
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
                type: "WARNING",
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
                    type: "BULKDELETEMSG",
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
            log("Autoremove", this.client.queueManager.queues);

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
                type: "MUTE",
                userId: member.user.id,
                guildId: guild.id,
                reason,
                moderatorId: moderator.id,
                expiresAt: duration ? new Date(Date.now() + duration) : undefined,
                queueId
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
        { guild, moderator, reason, notifyUser, autoRemoveQueue }: CommonOptions & { autoRemoveQueue?: boolean }
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
                type: "UNMUTE",
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
}
