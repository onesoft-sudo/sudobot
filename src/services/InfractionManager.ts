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

import { Infraction, InfractionDeliveryStatus, InfractionType } from "@prisma/client";
import { formatDistanceToNowStrict } from "date-fns";
import {
    APIEmbed,
    CategoryChannel,
    ChannelType,
    Colors,
    EmbedBuilder,
    PermissionFlagsBits,
    PrivateThreadChannel,
    Snowflake,
    TextBasedChannel,
    User,
    bold,
    italic,
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

@Name("infractionManager")
class InfractionManager extends Service {
    private readonly actionDoneNames: Record<InfractionType, string> = {
        [InfractionType.BEAN]: "beaned",
        [InfractionType.MASSKICK]: "kicked",
        [InfractionType.KICK]: "kicked",
        [InfractionType.MUTE]: "muted",
        [InfractionType.SOFTBAN]: "softbanned",
        [InfractionType.WARNING]: "warned",
        [InfractionType.MASSBAN]: "banned",
        [InfractionType.BAN]: "banned",
        [InfractionType.UNBAN]: "unbanned",
        [InfractionType.UNMUTE]: "unmuted",
        [InfractionType.BULK_DELETE_MESSAGE]: "bulk deleted messages",
        [InfractionType.TEMPBAN]: "temporarily banned",
        [InfractionType.NOTE]: "noted",
        [InfractionType.TIMEOUT]: "timed out",
        [InfractionType.TIMEOUT_REMOVE]: "removed timeout"
    };

    @Inject()
    private readonly configManager!: ConfigurationManager;

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
            const matches = [...finalReason.matchAll(/\{\{[A-Za-z0-9_-]+\}\}/gi)];

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

        const embed = {
            author: {
                name: `You've been ${this.actionDoneNames[infraction.type]} in ${guild.name}`,
                icon_url: guild.iconURL() ?? undefined
            },
            fields: [
                {
                    name: "Reason",
                    value: infraction.reason ?? "No reason provided"
                }
            ],
            color: Colors.Red,
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

        const channel = await guild.channels.create({
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

        return channel;
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
        const infraction = await this.application.prisma.$transaction(async prisma => {
            let infraction = await prisma.infraction.create({
                data: {
                    userId: user.id,
                    guildId,
                    moderatorId: moderator.id,
                    type: InfractionType.BEAN,
                    reason: this.processReason(guildId, reason)
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

            return infraction;
        });

        this.application.getClient().emit("infractionCreate", infraction, user, moderator, false);

        return {
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

        return {
            title: `Infraction #${infraction.id}`,
            author: {
                name: user.username,
                icon_url: user.displayAvatarURL()
            },
            description: `${bold(user.username)} has been ${
                this.actionDoneNames[infraction.type]
            }.`,
            fields,
            timestamp: new Date().toISOString(),
            color: Colors.Red
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

type InfractionCreateResult<E extends boolean = false> = {
    infraction: Infraction;
    overviewEmbed: E extends true ? APIEmbed : undefined;
};

export default InfractionManager;
