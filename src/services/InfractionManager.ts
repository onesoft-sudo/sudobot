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

import { Infraction, InfractionDeliveryStatus, InfractionType, PrismaClient } from "@prisma/client";
import { formatDistanceToNowStrict } from "date-fns";
import {
    APIEmbed, Awaitable,
    bold,
    CategoryChannel,
    ChannelType,
    Colors,
    EmbedBuilder, GuildMember,
    italic,
    PermissionFlagsBits,
    PrivateThreadChannel,
    Snowflake,
    TextBasedChannel,
    User,
    userMention
} from "discord.js";
import CommandAbortedError from "../framework/commands/CommandAbortedError";
import { Inject } from "../framework/container/Inject";
import { Name } from "../framework/services/Name";
import { Service } from "../framework/services/Service";
import { emoji } from "../framework/utils/emoji";
import InfractionChannelDeleteQueue from "../queues/InfractionChannelDeleteQueue";
import { GuildConfig } from "../types/GuildConfigSchema";
import { userInfo } from "../utils/embed";
import ConfigurationManager from "./ConfigurationManager";
import QueueService from "./QueueService";
import UnbanQueue from "../queues/UnbanQueue";

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
        [InfractionType.TIMEOUT_REMOVE]: "removed timeout"
    };

    @Inject()
    private readonly configManager!: ConfigurationManager;

    @Inject()
    private readonly queueService!: QueueService;

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
                )} The following placeholders were not found in the reason: \`${matches
                    .map(m => m[0])
                    .join("`, `")}\`
                        `;

                throw new CommandAbortedError(abortReason);
            }
        }

        return finalReason;
    }

    private async notify(
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
                name: `You have been ${actionDoneName} in ${guild.name}`,
                icon_url: guild.iconURL() ?? undefined
            },
            fields: [
                {
                    name: "Reason",
                    value: infraction.reason ?? "No reason provided"
                }
            ],
            color: actionDoneName === "bean" || actionDoneName.startsWith("un") ? Colors.Green : Colors.Red,
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

        try {
            await user.send({ embeds: [transformed] });
            return "notified";
        } catch {
            return (await this.handleFallback(user, infraction, transformed))
                ? "fallback"
                : "failed";
        }
    }

    private async handleFallback(
        user: User,
        infraction: Infraction,
        embed: EmbedBuilder | APIEmbed
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

        await channel.send({ embeds: [embed], content: `${userMention(user.id)}` });

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

    private async createInfraction<E extends boolean>(options: InfractionCreateOptions<E>): Promise<Infraction> {
        const { callback, guildId, moderator, reason, transformNotificationEmbed, payload, type } = options;
        const user = "member" in options ? options.member.user : options.user;
        const infraction = await this.application.prisma.$transaction(async prisma => {
            let infraction = await prisma.infraction.create({
                data: {
                    userId: user.id,
                    guildId,
                    moderatorId: moderator.id,
                    reason: this.processReason(guildId, reason),
                    type,
                    ...payload
                }
            });

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

            callback?.(infraction);
            return infraction;
        });

        this.application.getClient().emit("infractionCreate", infraction, user, moderator);
        return infraction;
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
            transformNotificationEmbed
        } = payload;
        const infraction: Infraction = await this.createInfraction({
            guildId,
            moderator,
            reason,
            transformNotificationEmbed,
            type: InfractionType.BEAN,
            user
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
                overviewEmbed: null,
            };
        }

        const {
            moderator,
            user,
            reason,
            guildId,
            generateOverviewEmbed,
            transformNotificationEmbed
        } = payload;
        const infraction: Infraction = await this.createInfraction({
            guildId,
            moderator,
            reason,
            transformNotificationEmbed,
            type: InfractionType.BAN,
            user,
            payload: {
                expiresAt: payload.duration
                    ? new Date(Date.now() + payload.duration)
                    : undefined,
                metadata: {
                    deletionTimeframe: payload.deletionTimeframe,
                    duration: payload.duration
                }
            },
        });

        try {
            await guild.bans.create(user, {
                reason: `${moderator.username} - ${infraction.reason ?? "No reason provided"}`,
                deleteMessageSeconds: payload.deletionTimeframe ? Math.floor(payload.deletionTimeframe / 1000) : undefined
            });

            await this.queueService.bulkCancel(UnbanQueue, queue => {
                return queue.data.userId === user.id && queue.data.guildId === guild.id;
            });

            if (payload.duration) {
                await this.queueService.create(UnbanQueue, {
                    data: {
                        guildId,
                        userId: user.id
                    },
                    guildId: guild.id,
                    runsAt: new Date(Date.now() + payload.duration)
                }).schedule();
            }
        }
        catch (error) {
            this.application.logger.error(error);

            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
            };
        }

        return {
            status: "success",
            infraction,
            overviewEmbed: (generateOverviewEmbed
                ? this.createOverviewEmbed(infraction, user, moderator)
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
                overviewEmbed: null,
            };
        }

        const {
            moderator,
            user,
            reason,
            guildId,
            generateOverviewEmbed,
            transformNotificationEmbed
        } = payload;
        const infraction: Infraction = await this.createInfraction({
            guildId,
            moderator,
            reason,
            transformNotificationEmbed,
            type: InfractionType.UNBAN,
            user
        });

        try {
            await guild.bans.remove(user, `${moderator.username} - ${infraction.reason ?? "No reason provided"}`);

            await this.queueService.bulkCancel(UnbanQueue, queue => {
                return queue.data.userId === user.id && queue.data.guildId === guild.id && !queue.isExecuting;
            });
        }
        catch (error) {
            this.application.logger.error(error);

            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
            };
        }

        return {
            status: "success",
            infraction,
            overviewEmbed: (generateOverviewEmbed
                ? this.createOverviewEmbed(infraction, user, moderator)
                : undefined) as E extends true ? APIEmbed : undefined
        };
    }

    private createOverviewEmbed(infraction: Infraction, user: User, moderator: User) {
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

        if (infraction.expiresAt) {
            fields.push({
                name: "Duration",
                value: formatDistanceToNowStrict(infraction.expiresAt)
            });
        }

        if (infraction.deliveryStatus !== InfractionDeliveryStatus.SUCCESS) {
            fields.push({
                name: "Notification",
                value:
                    infraction.deliveryStatus === InfractionDeliveryStatus.FAILED
                        ? "Failed to deliver a DM to this user."
                        : "Sent to fallback channel."
            });
        }

        const actionDoneName = this.actionDoneNames[infraction.type];

        return {
            title: `Infraction #${infraction.id}`,
            author: {
                name: user.username,
                icon_url: user.displayAvatarURL()
            },
            description: `${bold(user.username)} has been ${
                actionDoneName
            }.`,
            fields,
            timestamp: new Date().toISOString(),
            color: actionDoneName.startsWith("un") || actionDoneName === "bean" ? Colors.Green : Colors.Red
        } satisfies APIEmbed;
    }
}

type InfractionConfig = NonNullable<GuildConfig["infractions"]>;

type CommonOptions<E extends boolean> = {
    moderator: User;
    reason?: string;
    guildId: Snowflake;
    generateOverviewEmbed?: E;
    transformNotificationEmbed?: (embed: APIEmbed) => APIEmbed;
};

type CreateBeanPayload<E extends boolean> = CommonOptions<E> & {
    user: User;
};

type CreateUnbanPayload<E extends boolean> = CommonOptions<E> & {
    user: User;
};

type CreateBanPayload<E extends boolean> = CommonOptions<E> & {
    user: User;
    deletionTimeframe?: number;
    duration?: number;
};

type InfractionCreateResult<E extends boolean = false> = {
    status: "success";
    infraction: Infraction;
    overviewEmbed: E extends true ? APIEmbed : undefined;
} | {
    status: "failed";
    infraction: null;
    overviewEmbed: null;
};

type InfractionCreatePrismaPayload = Parameters<PrismaClient["infraction"]["create"]>[0]["data"];

type InfractionCreateOptions<E extends boolean> = CommonOptions<E> & {
    payload?: Partial<Omit<InfractionCreatePrismaPayload, "type">>;
    type: InfractionType;
    callback?: (infraction: Infraction) => Awaitable<void>;
} & (
    { user: User } | { member: GuildMember }
);

export default InfractionManager;
