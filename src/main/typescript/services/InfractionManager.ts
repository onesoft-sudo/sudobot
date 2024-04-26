/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2024 OSN Developers.
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

import CommandAbortedError from "@framework/commands/CommandAbortedError";
import { Inject } from "@framework/container/Inject";
import Duration from "@framework/datetime/Duration";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { emoji } from "@framework/utils/emoji";
import { fetchUser } from "@framework/utils/entities";
import { isDiscordAPIError } from "@framework/utils/errors";
import { also } from "@framework/utils/utils";
import type AuditLoggingService from "@main/services/AuditLoggingService";
import { LogEventType } from "@main/types/LoggingSchema";
import { Infraction, InfractionDeliveryStatus, InfractionType, PrismaClient } from "@prisma/client";
import { formatDistanceToNowStrict } from "date-fns";
import {
    APIEmbed,
    Awaitable,
    CategoryChannel,
    ChannelType,
    Collection,
    Colors,
    GuildMember,
    Message,
    MessageCreateOptions,
    MessagePayload,
    PartialMessage,
    PermissionFlagsBits,
    PrivateThreadChannel,
    Role,
    RoleResolvable,
    Snowflake,
    TextBasedChannel,
    TextChannel,
    User,
    bold,
    italic,
    userMention
} from "discord.js";
import InfractionChannelDeleteQueue from "../queues/InfractionChannelDeleteQueue";
import RoleQueue from "../queues/RoleQueue";
import UnbanQueue from "../queues/UnbanQueue";
import UnmuteQueue from "../queues/UnmuteQueue";
import { GuildConfig } from "../types/GuildConfigSchema";
import { userInfo } from "../utils/embed";
import ConfigurationManager from "./ConfigurationManager";
import QueueService from "./QueueService";

@Name("infractionManager")
class InfractionManager extends Service {
    private readonly actionDoneNames: Record<InfractionType, string> = {
        [InfractionType.BEAN]: "beaned",
        [InfractionType.MASSKICK]: "kicked",
        [InfractionType.KICK]: "kicked",
        [InfractionType.MUTE]: "muted",
        [InfractionType.WARNING]: "warned",
        [InfractionType.MASSBAN]: "banned",
        [InfractionType.BAN]: "banned",
        [InfractionType.UNBAN]: "unbanned",
        [InfractionType.UNMUTE]: "unmuted",
        [InfractionType.BULK_DELETE_MESSAGE]: "bulk deleted messages",
        [InfractionType.NOTE]: "noted",
        [InfractionType.TIMEOUT]: "timed out",
        [InfractionType.TIMEOUT_REMOVE]: "removed timeout",
        [InfractionType.ROLE]: "modified roles",
        [InfractionType.MOD_MESSAGE]: "sent a moderator message"
    };

    @Inject()
    private readonly configManager!: ConfigurationManager;

    @Inject()
    private readonly queueService!: QueueService;

    @Inject("auditLoggingService")
    private readonly auditLoggingService!: AuditLoggingService;

    public processReason(guildId: Snowflake, reason: string | undefined, abortOnNotFound = true) {
        if (!reason?.length) {
            return null;
        }

        let finalReason = reason;
        const configManager = this.application.getService(ConfigurationManager);
        const templates = configManager.config[guildId]?.infractions?.reason_templates ?? {};
        const templateWrapper =
            configManager.config[guildId]?.infractions?.reason_template_placeholder_wrapper ??
            "{{%name%}}";

        for (const key in templates) {
            const placeholder = templateWrapper.replace("%name%", `( *)${key}( *)`);
            finalReason = finalReason.replace(new RegExp(placeholder, "gi"), templates[key]);
        }

        if (abortOnNotFound) {
            const matches = [...finalReason.matchAll(/\{\{[A-Za-z0-9_-]+}}/gi)];

            if (matches.length > 0) {
                const abortReason = `${emoji(
                    this.application.getClient(),
                    "error"
                )} The following placeholders were not defined but used in the reason: \`${matches
                    .map(m => m[0])
                    .join("`, `")}\`
                        `;

                throw new CommandAbortedError(abortReason);
            }
        }

        return finalReason;
    }

    private async sendDirectMessage(
        user: User,
        guildId: Snowflake,
        options: MessagePayload | MessageCreateOptions,
        infraction?: Infraction
    ) {
        const guild = this.application.getClient().guilds.cache.get(guildId);

        if (!guild) {
            return false;
        }

        try {
            await user.send(options);
            return "notified";
        } catch {
            if (infraction) {
                return (await this.handleFallback(user, infraction, options))
                    ? "fallback"
                    : "failed";
            }

            return "failed";
        }
    }

    private notify(
        user: User,
        infraction: Infraction,
        transformNotificationEmbed?: (embed: APIEmbed) => APIEmbed
    ) {
        const guild = this.application.getClient().guilds.cache.get(infraction.guildId);

        if (!guild) {
            return false;
        }

        const actionDoneName = this.actionDoneNames[infraction.type];
        const embed = {
            author: {
                name:
                    infraction.type === InfractionType.ROLE
                        ? `Your role(s) have been changed in ${guild.name}`
                        : `You have been ${actionDoneName} in ${guild.name}`,
                icon_url: guild.iconURL() ?? undefined
            },
            fields: [
                {
                    name: "Reason",
                    value: infraction.reason ?? "No reason provided"
                }
            ],
            color:
                actionDoneName === "bean" || actionDoneName.startsWith("un")
                    ? Colors.Green
                    : Colors.Red,
            timestamp: new Date().toISOString()
        } satisfies APIEmbed;

        if (infraction.expiresAt) {
            embed.fields.push({
                name: "Duration",
                value: formatDistanceToNowStrict(infraction.expiresAt)
            });
        }

        if (this.configManager.config[guild.id]?.infractions?.send_ids_to_user) {
            embed.fields.push({
                name: "Infraction ID",
                value: infraction.id.toString()
            });
        }

        const transformed = transformNotificationEmbed ? transformNotificationEmbed(embed) : embed;
        return this.sendDirectMessage(
            user,
            infraction.guildId,
            { embeds: [transformed] },
            infraction
        );
    }

    private async handleFallback(
        user: User,
        infraction: Infraction,
        options: MessagePayload | MessageCreateOptions
    ) {
        if (
            (
                [
                    InfractionType.BAN,
                    InfractionType.MASSBAN,
                    InfractionType.KICK,
                    InfractionType.MASSKICK
                ] as InfractionType[]
            ).includes(infraction.type)
        ) {
            return false;
        }

        const config = this.configManager.config[infraction.guildId]?.infractions;
        let channel: TextBasedChannel | PrivateThreadChannel | null = null;

        try {
            if (config?.dm_fallback === "create_channel") {
                channel = await this.createFallbackChannel(user, infraction, config);
            } else if (config?.dm_fallback === "create_thread") {
                channel = await this.createFallbackThread(infraction, config);
            }
        } catch (error) {
            this.application.logger.error(error);
            return false;
        }

        if (!channel) {
            return false;
        }

        await channel.send({
            ...(options as MessageCreateOptions),
            content:
                `${userMention(user.id)}` +
                ("content" in options && options.content ? " " + options.content : "")
        });

        if (config?.dm_fallback_channel_expires_in && config.dm_fallback_channel_expires_in > 0) {
            const guild = this.client.guilds.cache.get(infraction.guildId);

            if (!guild) {
                return false;
            }

            await this.application
                .getServiceByName("queueService")
                .create(InfractionChannelDeleteQueue, {
                    data: {
                        channelId: channel.id,
                        type: config.dm_fallback === "create_channel" ? "channel" : "thread"
                    },
                    guildId: guild.id,
                    runsAt: new Date(Date.now() + config.dm_fallback_channel_expires_in)
                })
                .schedule();
        }

        return true;
    }

    private async createFallbackChannel(
        user: User,
        infraction: Infraction,
        config: InfractionConfig
    ) {
        const guild = this.client.guilds.cache.get(infraction.guildId);

        if (!guild) {
            return null;
        }

        return await guild.channels.create({
            type: ChannelType.GuildText,
            name: `infraction-${infraction.id}`,
            topic: `DM Fallback for Infraction #${infraction.id}`,
            parent: config.dm_fallback_parent_channel,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory
                    ]
                },
                {
                    id: user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
                }
            ],
            reason: `Creating DM Fallback for Infraction #${infraction.id}`
        });
    }

    private async createFallbackThread(infraction: Infraction, config: InfractionConfig) {
        const guild = this.client.guilds.cache.get(infraction.guildId);

        if (!guild || !config.dm_fallback_parent_channel) {
            return null;
        }

        const channel = guild.channels.cache.get(config.dm_fallback_parent_channel);

        if (
            !channel ||
            channel instanceof CategoryChannel ||
            channel.isVoiceBased() ||
            channel.isThread() ||
            channel.type === ChannelType.GuildMedia ||
            !channel.isTextBased()
        ) {
            return null;
        }

        return (await channel.threads.create({
            name: `infraction-${infraction.id}`,
            type: ChannelType.PrivateThread as unknown as never,
            reason: `Creating DM Fallback for Infraction #${infraction.id}`
        })) as PrivateThreadChannel;
    }

    public async createInfraction<E extends boolean>(
        options: InfractionCreateOptions<E>
    ): Promise<Infraction> {
        const {
            callback,
            guildId,
            moderator,
            reason,
            transformNotificationEmbed,
            payload,
            type,
            notify = true,
            processReason = true,
            failIfNotNotified = false
        } = options;
        const user =
            "member" in options && options.member
                ? options.member.user
                : (options as { user: User }).user;
        const infraction: Infraction = await this.application.prisma.$transaction(async prisma => {
            let infraction: Infraction = await prisma.infraction.create({
                data: {
                    userId: user.id,
                    guildId,
                    moderatorId: moderator.id,
                    reason: processReason ? this.processReason(guildId, reason) : reason,
                    type,
                    deliveryStatus:
                        type === InfractionType.UNBAN || !notify
                            ? InfractionDeliveryStatus.NOT_DELIVERED
                            : InfractionDeliveryStatus.SUCCESS,
                    ...payload
                }
            });

            if (type !== InfractionType.UNBAN && notify) {
                const status = await this.notify(user, infraction, transformNotificationEmbed);

                if (status !== "notified") {
                    infraction = await prisma.infraction.update({
                        where: { id: infraction.id },
                        data: {
                            deliveryStatus:
                                status === "failed"
                                    ? InfractionDeliveryStatus.FAILED
                                    : InfractionDeliveryStatus.FALLBACK
                        }
                    });
                }
            }

            callback?.(infraction);
            return infraction;
        });

        if (failIfNotNotified && infraction.deliveryStatus === InfractionDeliveryStatus.FAILED) {
            throw new Error("Failed to notify user");
        }

        this.application.getClient().emit("infractionCreate", infraction, user, moderator);
        return infraction;
    }

    public async getById(guildId: Snowflake, id: number): Promise<Infraction | null> {
        return await this.application.prisma.infraction.findFirst({
            where: { id, guildId }
        });
    }

    public async updateReasonById(
        guildId: Snowflake,
        id: number,
        reason: string,
        notify = true
    ): Promise<boolean> {
        reason = this.processReason(guildId, reason) ?? reason;

        const infraction: Infraction | null = await this.getById(guildId, id);

        if (!infraction) {
            return false;
        }

        if (notify) {
            const user = await fetchUser(this.application.getClient(), infraction.userId);
            const guild = this.getGuild(guildId);

            if (user && guild) {
                await this.sendDirectMessage(
                    user,
                    infraction.guildId,
                    {
                        embeds: [
                            {
                                author: {
                                    name: `Your ${this.prettifyInfractionType(infraction.type).toLowerCase()} has been updated in ${guild.name}`,
                                    icon_url: guild.iconURL() ?? undefined
                                },
                                color: Colors.Red,
                                fields: [
                                    {
                                        name: "New Reason",
                                        value: reason
                                    }
                                ],
                                timestamp: new Date().toISOString()
                            }
                        ]
                    },
                    infraction
                ).catch(this.application.logger.debug);
            }
        }

        return (
            (
                await this.application.prisma.infraction.updateMany({
                    where: { id, guildId },
                    data: { reason }
                })
            ).count > 0
        );
    }

    private async updateInfractionQueues(
        infraction: Infraction,
        duration: Duration | null
    ): Promise<void> {
        if (!infraction.expiresAt && !duration) {
            return;
        }

        const guild = this.getGuild(infraction.guildId);

        if (!guild) {
            return;
        }

        if (infraction.expiresAt) {
            switch (infraction.type) {
                case InfractionType.BAN:
                    await this.queueService.bulkCancel(UnbanQueue, queue => {
                        return (
                            queue.data.userId === infraction.userId &&
                            queue.data.guildId === guild.id &&
                            queue.data.infractionId === infraction.id
                        );
                    });

                    break;
                case InfractionType.MUTE:
                    await this.queueService.bulkCancel(UnmuteQueue, queue => {
                        return (
                            queue.data.memberId === infraction.userId &&
                            queue.data.guildId === guild.id &&
                            queue.data.infractionId === infraction.id
                        );
                    });

                    break;
                case InfractionType.ROLE:
                    await this.queueService.bulkCancel(RoleQueue, queue => {
                        return (
                            queue.data.memberId === infraction.userId &&
                            queue.data.guildId === guild.id &&
                            queue.data.infractionId === infraction.id
                        );
                    });

                    break;

                default:
                    throw new Error("Invalid infraction type");
            }
        }

        if (duration) {
            switch (infraction.type) {
                case InfractionType.BAN:
                    await this.queueService
                        .create(UnbanQueue, {
                            data: {
                                guildId: guild.id,
                                userId: infraction.userId,
                                infractionId: infraction.id
                            },
                            guildId: guild.id,
                            runsAt: duration.fromNow()
                        })
                        .schedule();

                    break;
                case InfractionType.MUTE:
                    await this.queueService
                        .create(UnmuteQueue, {
                            data: {
                                guildId: guild.id,
                                memberId: infraction.userId,
                                infractionId: infraction.id
                            },
                            guildId: guild.id,
                            runsAt: duration.fromNow()
                        })
                        .schedule();

                    break;
                case InfractionType.ROLE:
                    {
                        const metadata = infraction.metadata as {
                            roleIds: Snowflake[];
                            mode: "add" | "remove";
                        };

                        await this.queueService
                            .create(RoleQueue, {
                                data: {
                                    guildId: guild.id,
                                    memberId: infraction.userId,
                                    roleIds: metadata.roleIds,
                                    mode: metadata.mode,
                                    infractionId: infraction.id,
                                    reason: infraction.reason
                                        ? `<@${infraction.moderatorId}> - ${infraction.reason}`
                                        : undefined
                                },
                                guildId: guild.id,
                                runsAt: duration.fromNow()
                            })
                            .schedule();
                    }
                    break;

                default:
                    throw new Error("Invalid infraction type");
            }
        }
    }

    public async updateDurationById(
        guildId: Snowflake,
        id: number,
        duration: Duration | null,
        notify: boolean
    ): Promise<DurationUpdateResult> {
        const infraction: Infraction | null = await this.getById(guildId, id);

        if (!infraction || infraction.guildId !== guildId) {
            return {
                success: false,
                error: "infraction_not_found",
                infraction: undefined
            };
        }

        if (
            !([InfractionType.BAN, InfractionType.MUTE, InfractionType.ROLE] as string[]).includes(
                infraction.type
            )
        ) {
            return {
                success: false,
                error: "invalid_infraction_type",
                infraction
            };
        }

        if (infraction.expiresAt && Date.now() >= infraction.expiresAt.getTime()) {
            return {
                success: false,
                error: "infraction_expired",
                infraction
            };
        }

        if (infraction.type === InfractionType.MUTE && duration) {
            const config = this.configManager.config[guildId]?.muting;

            if (!config?.role && duration.toMilliseconds() > 28 * 24 * 60 * 60 * 1000) {
                return {
                    success: false,
                    error: "invalid_duration",
                    infraction
                };
            }
        }

        await this.updateInfractionQueues(infraction, duration);
        const updatedInfraction: Infraction = await this.application.prisma.infraction.update({
            where: { id, guildId },
            data: {
                expiresAt: duration?.fromNow() ?? null,
                metadata: { duration: duration?.toMilliseconds() ?? undefined }
            }
        });

        if (notify) {
            const user = await fetchUser(this.application.getClient(), infraction.userId);
            const guild = this.getGuild(guildId);

            if (user && guild) {
                await this.sendDirectMessage(
                    user,
                    infraction.guildId,
                    {
                        embeds: [
                            {
                                author: {
                                    name: `Your ${this.prettifyInfractionType(infraction.type).toLowerCase()} has been updated in ${guild.name}`,
                                    icon_url: guild.iconURL() ?? undefined
                                },
                                color: Colors.Red,
                                fields: [
                                    {
                                        name: "New Duration",
                                        value: duration?.toString() ?? "Indefinite"
                                    }
                                ],
                                timestamp: new Date().toISOString()
                            }
                        ]
                    },
                    infraction
                ).catch(this.application.logger.debug);
            }
        }

        return {
            success: true,
            infraction: updatedInfraction
        };
    }

    public async deleteById(guildId: Snowflake, id: number): Promise<Infraction | null> {
        return await this.application.prisma.infraction.delete({
            where: { id, guildId }
        });
    }

    public async deleteForUser(
        guildId: Snowflake,
        userId: string,
        type?: InfractionType
    ): Promise<number> {
        return (
            await this.application.prisma.infraction.deleteMany({
                where: {
                    userId,
                    guildId,
                    type: type ? { equals: type } : undefined
                }
            })
        ).count;
    }

    public async getUserInfractions(guildId: Snowflake, id: Snowflake): Promise<Infraction[]> {
        return await this.application.prisma.infraction.findMany({
            where: { userId: id, guildId }
        });
    }

    public prettifyInfractionType(type: InfractionType) {
        switch (type) {
            case InfractionType.BAN:
                return "Ban";
            case InfractionType.MASSBAN:
                return "Mass Ban";
            case InfractionType.KICK:
                return "Kick";
            case InfractionType.MASSKICK:
                return "Mass Kick";
            case InfractionType.MUTE:
                return "Mute";
            case InfractionType.UNMUTE:
                return "Unmute";
            case InfractionType.WARNING:
                return "Warning";
            case InfractionType.BEAN:
                return "Bean";
            case InfractionType.NOTE:
                return "Note";
            case InfractionType.BULK_DELETE_MESSAGE:
                return "Bulk Message Deletion";
            case InfractionType.TIMEOUT:
                return "Timeout";
            case InfractionType.TIMEOUT_REMOVE:
                return "Timeout Remove";
            case InfractionType.ROLE:
                return "Role Modification";
            case InfractionType.MOD_MESSAGE:
                return "Moderator Message";
            default:
                return "Unknown";
        }
    }

    private getGuild(guildId: Snowflake) {
        return this.client.guilds.cache.get(guildId);
    }

    public async createBean<E extends boolean>(
        payload: CreateBeanPayload<E>
    ): Promise<InfractionCreateResult<E>> {
        const {
            moderator,
            user,
            reason,
            guildId,
            generateOverviewEmbed,
            transformNotificationEmbed,
            notify = true
        } = payload;
        const infraction: Infraction = await this.createInfraction({
            guildId,
            moderator,
            reason,
            transformNotificationEmbed,
            type: InfractionType.BEAN,
            user,
            notify
        });

        return {
            status: "success",
            infraction,
            overviewEmbed: (generateOverviewEmbed
                ? this.createOverviewEmbed(infraction, user, moderator)
                : undefined) as E extends true ? APIEmbed : undefined
        };
    }

    public async createBan<E extends boolean>(
        payload: CreateBanPayload<E>
    ): Promise<InfractionCreateResult<E>> {
        const guild = this.getGuild(payload.guildId);

        if (!guild) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null
            };
        }

        const {
            moderator,
            user,
            reason,
            guildId,
            generateOverviewEmbed,
            transformNotificationEmbed,
            notify = true
        } = payload;
        const infraction: Infraction = await this.createInfraction({
            guildId,
            moderator,
            reason,
            transformNotificationEmbed,
            type: InfractionType.BAN,
            user,
            notify,
            payload: {
                expiresAt: payload.duration?.fromNow(),
                metadata: {
                    deletionTimeframe: payload.deletionTimeframe?.fromNowMilliseconds(),
                    duration: payload.duration?.fromNowMilliseconds()
                }
            }
        });

        try {
            await guild.bans.create(user, {
                reason: `${moderator.username} - ${infraction.reason ?? "No reason provided"}`,
                deleteMessageSeconds: payload.deletionTimeframe
                    ? payload.deletionTimeframe.toSeconds("floor")
                    : undefined
            });

            await this.queueService.bulkCancel(UnbanQueue, queue => {
                return queue.data.userId === user.id && queue.data.guildId === guild.id;
            });

            if (payload.duration) {
                await this.queueService
                    .create(UnbanQueue, {
                        data: {
                            guildId,
                            userId: user.id,
                            infractionId: infraction.id
                        },
                        guildId: guild.id,
                        runsAt: payload.duration.fromNow()
                    })
                    .schedule();
            }
        } catch (error) {
            this.application.logger.error(error);

            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null
            };
        }

        this.auditLoggingService
            .emitLogEvent(guildId, LogEventType.MemberBanAdd, {
                guild,
                user,
                moderator,
                reason,
                infractionId: infraction.id,
                duration: payload.duration
            })
            .catch(this.application.logger.error);

        return {
            status: "success",
            infraction,
            overviewEmbed: (generateOverviewEmbed
                ? this.createOverviewEmbed(infraction, user, moderator, {
                      duration: payload.duration
                  })
                : undefined) as E extends true ? APIEmbed : undefined
        };
    }

    public async createUnban<E extends boolean>(
        payload: CreateUnbanPayload<E>
    ): Promise<InfractionCreateResult<E>> {
        const guild = this.getGuild(payload.guildId);

        if (!guild) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null
            };
        }

        const {
            moderator,
            user,
            reason: rawReason,
            guildId,
            generateOverviewEmbed,
            transformNotificationEmbed
        } = payload;
        const reason = this.processReason(guildId, rawReason) ?? rawReason;

        try {
            await guild.bans.remove(
                user,
                `${moderator.username} - ${reason ?? "No reason provided"}`
            );
        } catch (error) {
            this.application.logger.error(error);

            if (isDiscordAPIError(error) && error.code === 10026) {
                return {
                    status: "failed",
                    infraction: null,
                    overviewEmbed: null,
                    errorType: "unknown_ban"
                };
            }

            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                errorType: "unban_failed"
            };
        }

        const infraction: Infraction = await this.createInfraction({
            guildId,
            moderator,
            reason,
            transformNotificationEmbed,
            type: InfractionType.UNBAN,
            user,
            notify: false,
            processReason: false
        });

        try {
            await this.queueService.bulkCancel(UnbanQueue, queue => {
                return (
                    queue.data.userId === user.id &&
                    queue.data.guildId === guild.id &&
                    !queue.isExecuting
                );
            });
        } catch (error) {
            this.application.logger.error(error);

            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                errorType: "queue_cancel_failed"
            };
        }

        this.auditLoggingService
            .emitLogEvent(guildId, LogEventType.MemberBanRemove, {
                guild,
                user,
                moderator,
                reason,
                infractionId: infraction.id
            })
            .catch(this.application.logger.error);

        return {
            status: "success",
            infraction,
            overviewEmbed: (generateOverviewEmbed
                ? this.createOverviewEmbed(infraction, user, moderator)
                : undefined) as E extends true ? APIEmbed : undefined
        };
    }

    public async createKick<E extends boolean>(
        payload: CreateKickPayload<E>
    ): Promise<InfractionCreateResult<E>> {
        const {
            moderator,
            member,
            reason,
            guildId,
            generateOverviewEmbed,
            transformNotificationEmbed,
            notify = true
        } = payload;

        const guild = this.getGuild(payload.guildId);

        if (!guild || !member.kickable) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null
            };
        }

        const infraction: Infraction = await this.createInfraction({
            guildId,
            moderator,
            reason,
            transformNotificationEmbed,
            type: InfractionType.KICK,
            user: member.user,
            notify
        });

        try {
            await member.kick(
                `${moderator.username} - ${infraction.reason ?? "No reason provided"}`
            );
        } catch (error) {
            this.application.logger.error(error);

            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null
            };
        }

        this.auditLoggingService
            .emitLogEvent(guildId, LogEventType.GuildMemberKick, {
                member,
                moderator,
                reason,
                infractionId: infraction.id
            })
            .catch(this.application.logger.error);

        return {
            status: "success",
            infraction,
            overviewEmbed: (generateOverviewEmbed
                ? this.createOverviewEmbed(infraction, member.user, moderator)
                : undefined) as E extends true ? APIEmbed : undefined
        };
    }

    public async createMute<E extends boolean>(
        payload: CreateMutePayload<E>
    ): Promise<InfractionCreateResult<E>> {
        const {
            moderator,
            member,
            reason: rawReason,
            guildId,
            duration,
            clearMessagesCount,
            channel,
            generateOverviewEmbed,
            transformNotificationEmbed,
            notify = true
        } = payload;
        let { mode } = payload;
        const guild = this.getGuild(payload.guildId);

        if ((channel && !clearMessagesCount) || (clearMessagesCount && !channel)) {
            throw new Error("Must provide both channel and clearMessagesCount");
        }

        if (!guild) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null
            };
        }

        const config = this.configManager.config[guildId]?.muting;
        const role = config?.role && mode !== "timeout" ? config?.role : undefined;

        if (!role && mode === "role") {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                errorType: "role_not_found",
                errorDescription: "Muted role not found"
            };
        }

        mode ??= role ? "role" : "timeout";

        if (mode === "timeout" && member.user.bot) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                errorType: "cannot_mute_a_bot",
                errorDescription: "Cannot mute a bot in timeout mode!"
            };
        }

        if (mode === "timeout" && !member.moderatable) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                errorType: "cannot_moderate",
                errorDescription: "This member cannot be moderated by me"
            };
        }

        if (mode === "timeout" && !duration) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                errorType: "invalid_duration",
                errorDescription: "Must provide duration when timing out"
            };
        }

        if (mode === "timeout" && (duration?.toMilliseconds() ?? 0) >= 28 * 24 * 60 * 60 * 1000) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                errorType: "invalid_duration",
                errorDescription: "Duration must be less than 28 days when timing out"
            };
        }

        if (mode === "role" && !member.manageable) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                errorType: "cannot_manage",
                errorDescription: "This member cannot be managed by me"
            };
        }

        if (
            (mode === "role" && member.roles.cache.has(role!)) ||
            (mode === "timeout" && member.communicationDisabledUntilTimestamp)
        ) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                errorType: "already_muted",
                errorDescription: "This member is already muted."
            };
        }

        const reason = this.processReason(guildId, rawReason) ?? rawReason;

        try {
            if (mode === "timeout" && duration) {
                await member.timeout(
                    duration.toMilliseconds(),
                    `${moderator.username} - ${reason}`
                );
            } else if (mode === "role" && role) {
                await member.roles.add(role, `${moderator.username} - ${reason}`);
            } else {
                throw new Error("Unreachable");
            }
        } catch (error) {
            this.application.logger.error(error);

            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null
            };
        }

        const infraction: Infraction = await this.createInfraction({
            guildId,
            moderator,
            reason,
            transformNotificationEmbed,
            type: InfractionType.MUTE,
            user: member.user,
            notify,
            payload: {
                metadata: {
                    type: role ? "role" : "timeout",
                    duration: duration?.fromNowMilliseconds()
                },
                expiresAt: duration ? duration.fromNow() : undefined
            },
            processReason: false
        });

        if (clearMessagesCount && channel) {
            await this.createClearMessages({
                guildId,
                moderator,
                user: member.user,
                reason: infraction.reason ?? undefined,
                channel,
                respond: true
            });
        }

        if (mode === "role" && role) {
            await this.queueService.bulkCancel(UnmuteQueue, queue => {
                return (
                    queue.data.memberId === member.id &&
                    queue.data.guildId === guild.id &&
                    !queue.isExecuting
                );
            });

            if (duration) {
                await this.queueService
                    .create(UnmuteQueue, {
                        data: {
                            guildId,
                            memberId: member.id,
                            infractionId: infraction.id
                        },
                        guildId: guild.id,
                        runsAt: duration.fromNow()
                    })
                    .schedule();
            }
        }

        this.auditLoggingService
            .emitLogEvent(guildId, LogEventType.MemberMuteAdd, {
                guild,
                member,
                moderator,
                reason,
                infractionId: infraction.id,
                duration
            })
            .catch(this.application.logger.error);

        return {
            status: "success",
            infraction,
            overviewEmbed: (generateOverviewEmbed
                ? this.createOverviewEmbed(infraction, member.user, moderator, {
                      duration
                  })
                : undefined) as E extends true ? APIEmbed : undefined
        };
    }

    public async createUnmute<E extends boolean>(
        payload: CreateUnmutePayload<E>
    ): Promise<InfractionCreateResult<E>> {
        const guild = this.getGuild(payload.guildId);

        if (!guild) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null
            };
        }

        const {
            moderator,
            member,
            reason: rawReason,
            guildId,
            generateOverviewEmbed,
            transformNotificationEmbed,
            notify = true
        } = payload;
        const { mode = "auto" } = payload;
        const config = this.configManager.config[guildId]?.muting;
        const role = config?.role && mode !== "timeout" ? config?.role : undefined;
        const finalMode = mode === "auto" ? (role ? "role" : "timeout") : mode;

        if (finalMode === "role" && !member.manageable) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                errorType: "permission",
                errorDescription: "Member is not manageable"
            };
        }

        if (finalMode === "timeout" && !member.moderatable) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                errorType: "permission",
                errorDescription: "Member is not moderatable"
            };
        }

        if (!role && finalMode === "role") {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                errorType: "role_not_found",
                errorDescription: "Muted role not found"
            };
        }

        if (
            (finalMode === "role" && role && !member.roles.cache.has(role)) ||
            (finalMode === "timeout" && !member.communicationDisabledUntilTimestamp)
        ) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                errorType: "not_muted",
                errorDescription: "This member is not muted"
            };
        }

        const reason = this.processReason(guildId, rawReason) ?? rawReason;

        try {
            if (
                finalMode === "timeout" &&
                member.communicationDisabledUntilTimestamp &&
                member.moderatable
            ) {
                await member.disableCommunicationUntil(null, `${moderator.username} - ${reason}`);
            }

            if (finalMode === "role" && role && member.roles.cache.has(role)) {
                await member.roles.remove(role, `${moderator.username} - ${reason}`);
            }

            await this.queueService.bulkCancel(UnmuteQueue, queue => {
                return (
                    queue.data.memberId === member.id &&
                    queue.data.guildId === guild.id &&
                    !queue.isExecuting
                );
            });
        } catch (error) {
            this.application.logger.error(error);

            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null
            };
        }

        const infraction: Infraction = await this.createInfraction({
            guildId,
            moderator,
            reason,
            transformNotificationEmbed,
            type: InfractionType.UNMUTE,
            user: member.user,
            notify,
            payload: {
                metadata: {
                    finalMode
                }
            },
            processReason: false
        });

        this.application.prisma.muteRecord
            .deleteMany({
                where: {
                    memberId: member.id,
                    guildId: guild.id
                }
            })
            .then();

        this.auditLoggingService
            .emitLogEvent(guildId, LogEventType.MemberMuteRemove, {
                guild,
                member,
                moderator,
                reason,
                infractionId: infraction.id
            })
            .catch(this.application.logger.error);

        return {
            status: "success",
            infraction,
            overviewEmbed: (generateOverviewEmbed
                ? this.createOverviewEmbed(infraction, member.user, moderator)
                : undefined) as E extends true ? APIEmbed : undefined
        };
    }

    public async recordMuteIfNeeded(member: GuildMember) {
        const config = this.configManager.config[member.guild.id]?.muting;
        const role = config?.role;

        if (!role) {
            return;
        }

        const existing = await this.application.prisma.muteRecord.findFirst({
            where: {
                memberId: member.id,
                guildId: member.guild.id
            }
        });

        if (existing) {
            return;
        }

        await this.application.prisma.muteRecord.create({
            data: {
                memberId: member.id,
                guildId: member.guild.id
            }
        });
    }

    public async reapplyMuteIfNeeded(member: GuildMember) {
        const config = this.configManager.config[member.guild.id]?.muting;
        const role = config?.role;

        if (!role) {
            return;
        }

        const existing = await this.application.prisma.muteRecord.findFirst({
            where: {
                memberId: member.id,
                guildId: member.guild.id
            }
        });

        if (!existing) {
            return;
        }

        await member.roles.add(role, "Reapplying mute role");
    }

    public async createRoleModification<E extends boolean>(
        payload: CreateRoleModificationPayload<E>
    ): Promise<InfractionCreateResult<E>> {
        const guild = this.getGuild(payload.guildId);

        if (!guild) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null
            };
        }

        const {
            moderator,
            member,
            reason: rawReason,
            guildId,
            generateOverviewEmbed,
            transformNotificationEmbed,
            notify = true,
            mode,
            roles,
            duration
        } = payload;

        if (!member.manageable) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                errorType: "permission",
                errorDescription: "Member is not manageable"
            };
        }

        const reason = this.processReason(guildId, rawReason) ?? rawReason;

        try {
            if (mode === "give") {
                await member.roles.add(roles, `${moderator.username} - ${reason}`);
            } else {
                await member.roles.remove(roles, `${moderator.username} - ${reason}`);
            }
        } catch (error) {
            this.application.logger.error(error);

            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null
            };
        }

        const infraction: Infraction = await this.createInfraction({
            guildId,
            moderator,
            reason,
            transformNotificationEmbed,
            type: InfractionType.ROLE,
            user: member.user,
            notify,
            payload: {
                metadata: {
                    mode,
                    roles,
                    duration
                },
                expiresAt: duration ? duration.fromNow() : undefined
            },
            processReason: false
        });

        if (duration !== undefined) {
            await this.queueService
                .create(RoleQueue, {
                    data: {
                        memberId: member.id,
                        guildId: guild.id,
                        roleIds: roles.map(role => (typeof role === "string" ? role : role.id)),
                        mode: mode === "give" ? "remove" : "add",
                        reason: `${moderator.username} - ${reason}`,
                        infractionId: infraction.id
                    },
                    guildId: guild.id,
                    runsAt: duration.fromNow()
                })
                .schedule();
        }

        const overviewEmbed = generateOverviewEmbed
            ? this.createOverviewEmbed(infraction, member.user, moderator, {
                  duration
              })
            : undefined;

        const summaryOfRoles =
            roles
                .slice(0, 8)
                .reduce((acc: string, role) => {
                    if (typeof role === "string") {
                        return `${acc}, <@&${role}>`;
                    }

                    return `${acc}, <@&${role.id}>`;
                }, "")
                .slice(2) + (roles.length > 8 ? " **+ " + (roles.length - 8) + " more**" : "");

        overviewEmbed?.fields.push({
            name: `${mode === "give" ? "Added" : "Removed"} Roles`,
            value: summaryOfRoles
        });

        this.auditLoggingService
            .emitLogEvent(guildId, LogEventType.MemberRoleModification, {
                member,
                moderator,
                reason,
                infractionId: infraction?.id,
                added: mode === "give" ? roles.map(r => (r instanceof Role ? r.id : r)) : undefined,
                removed:
                    mode === "take" ? roles.map(r => (r instanceof Role ? r.id : r)) : undefined,
                guild
            })
            .catch(this.application.logger.error);

        return {
            status: "success",
            infraction,
            overviewEmbed: overviewEmbed as E extends true ? APIEmbed : undefined
        };
    }

    public async createClearMessages(
        payload: CreateClearMessagesPayload<false>
    ): Promise<MessageBulkDeleteResult> {
        const {
            moderator,
            user,
            reason,
            guildId,
            transformNotificationEmbed,
            channel,
            count,
            respond = true,
            filters = []
        } = payload;

        if (!user && !count) {
            throw new Error("Must provide either user or count");
        }

        if (count && count > 100) {
            throw new Error("Cannot bulk delete more than 100 messages at once");
        }

        const guild = this.getGuild(payload.guildId);

        if (!guild) {
            return {
                status: "failed",
                overviewEmbed: null
            };
        }

        let infraction: Infraction | undefined;

        if (user) {
            infraction = await this.createInfraction({
                guildId,
                moderator,
                reason,
                transformNotificationEmbed,
                type: InfractionType.BULK_DELETE_MESSAGE,
                user,
                notify: false
            });
        }

        const finalFilters = [...filters];
        let finalCount: number = 0;

        if (user) {
            finalFilters.push((message: Message) => message.author.id === user.id);
        }

        let deletedMessages:
            | Collection<Snowflake, Message | PartialMessage | undefined>
            | undefined;

        try {
            const messages = await channel.messages.fetch({ limit: count ?? 100 });
            const messagesToDelete = [];

            for (const message of messages.values()) {
                if (finalFilters.length === 0) {
                    messagesToDelete.push(message);
                    continue;
                }

                for (const filter of finalFilters) {
                    if (await filter(message)) {
                        messagesToDelete.push(message);
                        break;
                    }
                }
            }

            if (messagesToDelete.length > 0) {
                deletedMessages = await channel.bulkDelete(messagesToDelete, true);
                finalCount = deletedMessages.size;
            }
        } catch (error) {
            this.application.logger.error(error);

            return {
                status: "failed",
                overviewEmbed: null
            };
        }

        if (respond) {
            const message = await channel
                .send({
                    content: `${emoji(this.application.getClient(), "check")} Cleared ${bold(
                        finalCount.toString()
                    )} messages${user ? ` from user ${bold(user.username)}` : ""}`
                })
                .catch(this.application.logger.error);

            if (message?.deletable) {
                setTimeout(() => {
                    if (message?.deletable) {
                        message.delete().catch(this.application.logger.error);
                    }
                }, 6000);
            }
        }

        this.auditLoggingService
            .emitLogEvent(guildId, LogEventType.MessageDeleteBulk, {
                user,
                moderator,
                reason,
                infractionId: infraction?.id,
                channel,
                messages: deletedMessages ?? new Collection()
            })
            .catch(this.application.logger.error);

        return {
            status: "success",
            count: finalCount
        };
    }

    public async createWarning<E extends boolean>(
        payload: CreateWarningPayload<E>
    ): Promise<InfractionCreateResult<E>> {
        const {
            moderator,
            member,
            reason,
            guildId,
            generateOverviewEmbed,
            transformNotificationEmbed,
            notify = true
        } = payload;

        const guild = this.getGuild(payload.guildId);

        if (!guild) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null
            };
        }

        const infraction: Infraction = await this.createInfraction({
            guildId,
            moderator,
            reason,
            transformNotificationEmbed,
            type: InfractionType.WARNING,
            user: member.user,
            notify
        });

        this.auditLoggingService
            .emitLogEvent(guildId, LogEventType.MemberWarningAdd, {
                member,
                moderator,
                reason,
                infractionId: infraction.id
            })
            .catch(this.application.logger.error);

        return {
            status: "success",
            infraction,
            overviewEmbed: (generateOverviewEmbed
                ? this.createOverviewEmbed(infraction, member.user, moderator)
                : undefined) as E extends true ? APIEmbed : undefined
        };
    }

    public async createModeratorMessage<E extends boolean>(
        payload: CreateModeratorMessage<E>
    ): Promise<InfractionCreateResult<E>> {
        const {
            moderator,
            member,
            reason,
            guildId,
            generateOverviewEmbed,
            transformNotificationEmbed,
            notify = true
        } = payload;

        const guild = this.getGuild(payload.guildId);

        if (!guild) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null
            };
        }

        try {
            const infraction: Infraction = await this.createInfraction({
                guildId,
                moderator,
                reason,
                transformNotificationEmbed:
                    transformNotificationEmbed ??
                    (embed =>
                        also(embed, embed => {
                            embed.author!.name = `You have received a moderator message in ${guild.name}`;
                        })),
                type: InfractionType.MOD_MESSAGE,
                user: member.user,
                notify,
                failIfNotNotified: true
            });

            this.auditLoggingService
                .emitLogEvent(guildId, LogEventType.MemberModeratorMessageAdd, {
                    member,
                    moderator,
                    reason,
                    infractionId: infraction.id
                })
                .catch(this.application.logger.error);

            return {
                status: "success",
                infraction,
                overviewEmbed: (generateOverviewEmbed
                    ? this.createOverviewEmbed(infraction, member.user, moderator)
                    : undefined) as E extends true ? APIEmbed : undefined
            };
        } catch (error) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null
            };
        }
    }

    public async createNote<E extends boolean>(
        payload: CreateNotePayload<E>
    ): Promise<InfractionCreateResult<E>> {
        const {
            moderator,
            user,
            reason,
            guildId,
            generateOverviewEmbed,
            transformNotificationEmbed
        } = payload;

        const guild = this.getGuild(payload.guildId);

        if (!guild) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null
            };
        }

        const infraction: Infraction = await this.createInfraction({
            guildId,
            moderator,
            reason,
            transformNotificationEmbed,
            type: InfractionType.NOTE,
            user,
            notify: false
        });

        this.auditLoggingService
            .emitLogEvent(guildId, LogEventType.UserNoteAdd, {
                guild,
                user,
                moderator,
                reason,
                infractionId: infraction.id
            })
            .catch(this.application.logger.error);

        return {
            status: "success",
            infraction,
            overviewEmbed: (generateOverviewEmbed
                ? this.createOverviewEmbed(infraction, user, moderator, {
                      includeNotificationStatusInEmbed: false
                  })
                : undefined) as E extends true ? APIEmbed : undefined
        };
    }

    private createOverviewEmbed(
        infraction: Infraction,
        user: User,
        moderator: User,
        options?: CreateOverviewOptions
    ) {
        const fields = [
            {
                name: "Reason",
                value: infraction.reason ?? italic("No reason provided")
            },
            {
                name: "User",
                value: userInfo(user)
            },
            {
                name: "Moderator",
                value: userInfo(moderator)
            }
        ];
        const { includeNotificationStatusInEmbed = true } = options ?? {};

        if (infraction.expiresAt || options?.duration) {
            fields.push({
                name: "Duration",
                value:
                    options?.duration?.toString() ??
                    formatDistanceToNowStrict(infraction.expiresAt!, {
                        roundingMethod: "round"
                    })
            });
        }

        if (
            infraction.deliveryStatus !== InfractionDeliveryStatus.SUCCESS &&
            includeNotificationStatusInEmbed
        ) {
            fields.push({
                name: "Notification",
                value:
                    infraction.deliveryStatus === InfractionDeliveryStatus.FAILED
                        ? "Failed to deliver a DM to this user."
                        : infraction.deliveryStatus === InfractionDeliveryStatus.FALLBACK
                          ? "Sent to fallback channel."
                          : "Not delivered."
            });
        }

        const actionDoneName = this.actionDoneNames[infraction.type];

        return {
            title: `Infraction #${infraction.id}`,
            author: {
                name: user.username,
                icon_url: user.displayAvatarURL()
            },
            description:
                infraction.type === InfractionType.ROLE
                    ? `Roles for ${bold(user.username)} have been updated.`
                    : `${bold(user.username)} has been ${actionDoneName}.`,
            fields,
            timestamp: new Date().toISOString(),
            color:
                actionDoneName.startsWith("un") || actionDoneName === "bean"
                    ? Colors.Green
                    : Colors.Red
        } satisfies APIEmbed;
    }
}

type InfractionConfig = NonNullable<GuildConfig["infractions"]>;

type CreateOverviewOptions = {
    includeNotificationStatusInEmbed?: boolean;
    duration?: Duration;
};

type CommonOptions<E extends boolean> = {
    moderator: User;
    reason?: string;
    guildId: Snowflake;
    generateOverviewEmbed?: E;
    transformNotificationEmbed?: (embed: APIEmbed) => APIEmbed;
    notify?: boolean;
};

type CreateBeanPayload<E extends boolean> = CommonOptions<E> & {
    user: User;
};

type CreateUnbanPayload<E extends boolean> = Omit<CommonOptions<E>, "notify"> & {
    user: User;
};

type CreateNotePayload<E extends boolean> = Omit<CommonOptions<E>, "notify"> & {
    user: User;
};

type CreateUnmutePayload<E extends boolean> = CommonOptions<E> & {
    member: GuildMember;
    mode?: "role" | "timeout" | "auto";
};

type CreateKickPayload<E extends boolean> = CommonOptions<E> & {
    member: GuildMember;
};

type CreateWarningPayload<E extends boolean> = CommonOptions<E> & {
    member: GuildMember;
};

type CreateModeratorMessage<E extends boolean> = CommonOptions<E> & {
    member: GuildMember;
};

type CreateClearMessagesPayload<E extends boolean> = Omit<CommonOptions<E>, "notify"> & {
    user?: User;
    channel: TextChannel;
    count?: number;
    filters?: Array<MessageFilter>;
    respond?: boolean;
};

type MessageFilter = (message: Message) => Awaitable<boolean>;

type CreateMutePayload<E extends boolean> = CommonOptions<E> & {
    member: GuildMember;
    duration?: Duration;
    mode?: "role" | "timeout";
    clearMessagesCount?: number;
    channel?: TextChannel;
};

type CreateBanPayload<E extends boolean> = CommonOptions<E> & {
    user: User;
    deletionTimeframe?: Duration;
    duration?: Duration;
};

type CreateRoleModificationPayload<E extends boolean> = CommonOptions<E> & {
    member: GuildMember;
    mode: "give" | "take";
    roles: RoleResolvable[];
    duration?: Duration;
};

type InfractionCreateResult<E extends boolean = false> =
    | {
          status: "success";
          infraction: Infraction;
          overviewEmbed: E extends true ? APIEmbed : undefined;
      }
    | {
          status: "failed";
          infraction: null;
          overviewEmbed: null;
          errorType?: string;
          errorDescription?: string;
      };

type MessageBulkDeleteResult =
    | {
          status: "success";
          count: number;
      }
    | Omit<Extract<InfractionCreateResult<false>, { status: "failed" }>, "infraction">;

type InfractionCreatePrismaPayload = Parameters<PrismaClient["infraction"]["create"]>[0]["data"];

type InfractionCreateOptions<E extends boolean> = CommonOptions<E> & {
    payload?: Partial<Omit<InfractionCreatePrismaPayload, "type">>;
    type: InfractionType;
    callback?: (infraction: Infraction) => Awaitable<void>;
    notify?: boolean;
    sendLog?: boolean;
    processReason?: boolean;
    failIfNotNotified?: boolean;
} & ({ user: User } | { member: GuildMember });

type DurationUpdateResult = {
    success?: boolean;
    infraction?: Infraction;
    error?: string;
};

export default InfractionManager;
