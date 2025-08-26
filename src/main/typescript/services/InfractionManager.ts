/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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
import APIErrors from "@framework/errors/APIErrors";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { fetchMember, fetchUser } from "@framework/utils/entities";
import { isDiscordAPIError } from "@framework/utils/errors";
import { also, suppressErrorNoReturn } from "@framework/utils/utils";
import {
    Infraction,
    InfractionCreatePayload,
    InfractionDeliveryStatus,
    InfractionType,
    infractions
} from "@main/models/Infraction";
import { muteRecords } from "@main/models/MuteRecord";
import MassUnbanQueue from "@main/queues/MassUnbanQueue";
import { LogEventType } from "@main/schemas/LoggingSchema";
import type AuditLoggingService from "@main/services/AuditLoggingService";
import { downloadFile } from "@main/utils/download";
import { emoji } from "@main/utils/emoji";
import { systemPrefix } from "@main/utils/utils";
import { AsciiTable3 } from "ascii-table3";
import { formatDistanceStrict, formatDistanceToNowStrict } from "date-fns";
import {
    APIEmbed,
    Attachment,
    Awaitable,
    CategoryChannel,
    ChannelType,
    Collection,
    Colors,
    DiscordAPIError,
    Guild,
    GuildMember,
    GuildTextBasedChannel,
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
    User,
    bold,
    italic,
    userMention
} from "discord.js";
import { and, eq, inArray, not } from "drizzle-orm";
import { existsSync } from "fs";
import { unlink } from "fs/promises";
import path, { basename } from "path";
import InfractionChannelDeleteQueue from "../queues/InfractionChannelDeleteQueue";
import RoleQueue from "../queues/RoleQueue";
import UnbanQueue from "../queues/UnbanQueue";
import UnmuteQueue from "../queues/UnmuteQueue";
import { GuildConfig } from "../schemas/GuildConfigSchema";
import { userInfo } from "../utils/embed";
import ConfigurationManager from "./ConfigurationManager";
import QueueService from "./QueueService";

@Name("infractionManager")
class InfractionManager extends Service {
    private readonly actionDoneNames: Record<InfractionType, string> = {
        [InfractionType.Bean]: "beaned",
        [InfractionType.MassKick]: "kicked",
        [InfractionType.Kick]: "kicked",
        [InfractionType.Mute]: "muted",
        [InfractionType.Warning]: "warned",
        [InfractionType.MassBan]: "banned",
        [InfractionType.Ban]: "banned",
        [InfractionType.Unban]: "unbanned",
        [InfractionType.Unmute]: "unmuted",
        [InfractionType.BulkDeleteMessage]: "bulk deleted messages",
        [InfractionType.Note]: "noted",
        [InfractionType.Timeout]: "timed out",
        [InfractionType.TimeoutRemove]: "removed timeout",
        [InfractionType.Role]: "modified roles",
        [InfractionType.ModMessage]: "sent a moderator message",
        [InfractionType.Shot]: "given a shot",
        [InfractionType.ReactionClear]: "cleared reactions"
    };

    private readonly typeToPointKeyMap = {
        [InfractionType.MassBan]: "massban",
        [InfractionType.MassKick]: "masskick",
        [InfractionType.Mute]: "mute",
        [InfractionType.Ban]: "ban",
        [InfractionType.BulkDeleteMessage]: "clear",
        [InfractionType.Role]: "role",
        [InfractionType.Timeout]: "timeout",
        [InfractionType.Warning]: "warning",
        [InfractionType.Kick]: "kick",
        [InfractionType.ModMessage]: "mod_message",
        [InfractionType.Note]: "note",
        [InfractionType.Unban]: "unban",
        [InfractionType.ReactionClear]: "reaction_clear"
    } satisfies {
        [K in InfractionType]?: keyof NonNullable<
            GuildConfig["infractions"]
        >["points"];
    };

    @Inject()
    private readonly configManager!: ConfigurationManager;

    @Inject()
    private readonly queueService!: QueueService;

    @Inject("auditLoggingService")
    private readonly auditLoggingService!: AuditLoggingService;

    private createError<E extends boolean>(result: InfractionCreateResult<E>) {
        const clone = { ...result };

        if (clone.status === "failed" && clone.errorType === "api_error") {
            clone.errorDescription ??= APIErrors.translateToMessage(clone.code);

            if (clone.errorDescription !== "An unknown error has occurred") {
                clone.errorDescription = `Error: ${clone.errorDescription}`;
            }
        }

        return clone;
    }

    public processReason(
        guildId: Snowflake,
        reason: string | undefined,
        abortOnNotFound = true
    ) {
        if (!reason?.length) {
            return null;
        }

        let finalReason = reason;
        const configManager = this.application.getService(ConfigurationManager);
        const templates =
            configManager.config[guildId]?.infractions?.reason_templates ?? {};
        const templateWrapper =
            configManager.config[guildId]?.infractions
                ?.reason_template_placeholder_wrapper ?? "{{%name%}}";

        for (const key in templates) {
            const placeholder = templateWrapper.replace(
                "%name%",
                `( *)${key}( *)`
            );
            finalReason = finalReason.replace(
                new RegExp(placeholder, "gi"),
                templates[key]
            );
        }

        if (abortOnNotFound) {
            const matches = [...finalReason.matchAll(/\{\{[A-Za-z0-9_-]+}}/gi)];

            if (matches.length > 0) {
                const abortReason = `${emoji(
                    this.application,
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
        transformNotificationEmbed?: (embed: APIEmbed) => APIEmbed,
        _troll = false
    ) {
        const guild = this.application
            .getClient()
            .guilds.cache.get(infraction.guildId);

        if (!guild) {
            return false;
        }

        const actionDoneName = this.actionDoneNames[infraction.type];
        const embed = {
            author: {
                name:
                    infraction.type === InfractionType.Role
                        ? `Your role(s) have been changed in ${guild.name}`
                        : infraction.type === InfractionType.BulkDeleteMessage
                          ? `Your messages were cleared in ${guild.name}`
                          : infraction.type === InfractionType.ReactionClear
                            ? `Your reactions were cleared in ${guild.name}`
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

        if (
            this.configManager.config[guild.id]?.infractions?.send_ids_to_user
        ) {
            embed.fields.push({
                name: "Infraction ID",
                value: infraction.id.toString()
            });
        }

        const transformed = transformNotificationEmbed
            ? transformNotificationEmbed(embed)
            : embed;
        const attachmentStoragePath = systemPrefix("storage/attachments", true);

        return this.sendDirectMessage(
            user,
            infraction.guildId,
            {
                embeds: [transformed],
                files:
                    infraction.type === InfractionType.Bean || _troll
                        ? infraction.attachments
                        : infraction.attachments
                              .map(file =>
                                  path.join(attachmentStoragePath, file)
                              )
                              .filter(existsSync)
            },
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
                    InfractionType.Ban,
                    InfractionType.MassBan,
                    InfractionType.Kick,
                    InfractionType.MassKick
                ] as InfractionType[]
            ).includes(infraction.type)
        ) {
            return false;
        }

        const config =
            this.configManager.config[infraction.guildId]?.infractions;
        let channel: TextBasedChannel | PrivateThreadChannel | null = null;

        try {
            if (config?.dm_fallback === "create_channel") {
                channel = await this.createFallbackChannel(
                    user,
                    infraction,
                    config
                );
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
                ("content" in options && options.content
                    ? " " + options.content
                    : "")
        });

        if (
            config?.dm_fallback_channel_expires_in &&
            config.dm_fallback_channel_expires_in > 0
        ) {
            const guild = this.client.guilds.cache.get(infraction.guildId);

            if (!guild) {
                return false;
            }

            await this.application
                .service("queueService")
                .create(InfractionChannelDeleteQueue, {
                    data: {
                        channelId: channel.id,
                        type:
                            config.dm_fallback === "create_channel"
                                ? "channel"
                                : "thread"
                    },
                    guildId: guild.id,
                    runsAt: new Date(
                        Date.now() + config.dm_fallback_channel_expires_in
                    )
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
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.ReadMessageHistory
                    ]
                }
            ],
            reason: `Creating DM Fallback for Infraction #${infraction.id}`
        });
    }

    private async saveAttachments(attachments: Array<string | Attachment>) {
        const attachmentFileLocalNames: string[] = [];

        for (const attachment of attachments) {
            const attachmentFileURL =
                typeof attachment === "string"
                    ? attachment
                    : attachment.proxyURL;
            const attachmentFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${basename(attachmentFileURL.substring(0, attachmentFileURL.indexOf("?")))}`;

            await downloadFile({
                url: attachmentFileURL,
                name: attachmentFileName,
                path: systemPrefix("storage/attachments", true)
            });

            attachmentFileLocalNames.push(attachmentFileName);
        }

        return attachmentFileLocalNames;
    }

    private async createFallbackThread(
        infraction: Infraction,
        config: InfractionConfig
    ) {
        const guild = this.client.guilds.cache.get(infraction.guildId);

        if (!guild || !config.dm_fallback_parent_channel) {
            return null;
        }

        const channel = guild.channels.cache.get(
            config.dm_fallback_parent_channel
        );

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
            attachments = [],
            notify = true,
            processReason = true,
            failIfNotNotified = false
        } = options;
        const user =
            "member" in options && options.member
                ? options.member.user
                : (options as { user: User }).user;

        if (attachments.length > 10) {
            throw new Error(
                "Cannot create an infraction with more than 10 attachments"
            );
        }

        const attachmentFileLocalNames: string[] =
            await this.saveAttachments(attachments);

        try {
            const infraction: Infraction =
                await this.application.database.drizzle.transaction(
                    async (tx): Promise<Infraction> => {
                        let [newInfraction] = await tx
                            .insert(infractions)
                            .values({
                                userId: user.id,
                                guildId,
                                moderatorId: moderator.id,
                                reason: processReason
                                    ? this.processReason(guildId, reason)
                                    : reason,
                                type,
                                deliveryStatus:
                                    type === InfractionType.Unban || !notify
                                        ? InfractionDeliveryStatus.NotDelivered
                                        : InfractionDeliveryStatus.Success,
                                attachments: attachmentFileLocalNames,
                                ...payload
                            })
                            .returning();

                        if (type !== InfractionType.Unban && notify) {
                            const status = await this.notify(
                                user,
                                newInfraction,
                                transformNotificationEmbed
                            );

                            if (status !== "notified") {
                                const [updatedInfraction] = await tx
                                    .update(infractions)
                                    .set({
                                        deliveryStatus:
                                            status === "failed"
                                                ? InfractionDeliveryStatus.Failed
                                                : InfractionDeliveryStatus.Fallback
                                    })
                                    .where(eq(infractions.id, newInfraction.id))
                                    .returning();

                                newInfraction = updatedInfraction;
                            }
                        }

                        const promise = callback?.(newInfraction);

                        if (promise instanceof Promise) {
                            promise.catch(this.application.logger.error);
                        }

                        return newInfraction;
                    }
                );

            if (
                failIfNotNotified &&
                infraction.deliveryStatus === InfractionDeliveryStatus.Failed
            ) {
                throw new Error("Failed to notify user");
            }

            this.application
                .getClient()
                .emit("infractionCreate", infraction, user, moderator);
            return infraction;
        } catch (error) {
            await this.deleteAttachments(attachmentFileLocalNames);
            throw error;
        }
    }

    public async getById(
        guildId: Snowflake,
        id: number
    ): Promise<Infraction | undefined> {
        return await this.application.database.query.infractions.findFirst({
            where: and(eq(infractions.id, id), eq(infractions.guildId, guildId))
        });
    }

    public async updateReasonById(
        guildId: Snowflake,
        id: number,
        reason: string,
        notify = true
    ): Promise<boolean> {
        reason = this.processReason(guildId, reason) ?? reason;

        const infraction: Infraction | undefined = await this.getById(
            guildId,
            id
        );

        if (!infraction) {
            return false;
        }

        if (notify) {
            const user = await fetchUser(
                this.application.getClient(),
                infraction.userId
            );
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

        return !!(
            await this.application.database.drizzle
                .update(infractions)
                .set({ reason })
                .where(
                    and(
                        eq(infractions.id, id),
                        eq(infractions.guildId, guildId)
                    )
                )
                .returning({
                    id: infractions.id
                })
        )[0];
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
                case InfractionType.Ban:
                    await this.queueService.bulkCancel(UnbanQueue, queue => {
                        return (
                            queue.data.userId === infraction.userId &&
                            queue.data.guildId === guild.id &&
                            queue.data.infractionId === infraction.id
                        );
                    });

                    break;
                case InfractionType.Mute:
                    await this.queueService.bulkCancel(UnmuteQueue, queue => {
                        return (
                            queue.data.memberId === infraction.userId &&
                            queue.data.guildId === guild.id &&
                            queue.data.infractionId === infraction.id
                        );
                    });

                    break;
                case InfractionType.Role:
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
                case InfractionType.Ban:
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
                case InfractionType.Mute:
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
                case InfractionType.Role:
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
        const infraction: Infraction | undefined = await this.getById(
            guildId,
            id
        );

        if (!infraction || infraction.guildId !== guildId) {
            return {
                success: false,
                error: "infraction_not_found",
                infraction: undefined
            };
        }

        if (
            !(
                [
                    InfractionType.Ban,
                    InfractionType.Mute,
                    InfractionType.Role
                ] as string[]
            ).includes(infraction.type)
        ) {
            return {
                success: false,
                error: "invalid_infraction_type",
                infraction
            };
        }

        if (
            infraction.expiresAt &&
            Date.now() >= infraction.expiresAt.getTime()
        ) {
            return {
                success: false,
                error: "infraction_expired",
                infraction
            };
        }

        if (infraction.type === InfractionType.Mute && duration) {
            const config = this.configManager.config[guildId]?.muting;

            if (
                !config?.role &&
                duration.toMilliseconds() > 28 * 24 * 60 * 60 * 1000
            ) {
                return {
                    success: false,
                    error: "invalid_duration",
                    infraction
                };
            }
        }

        await this.updateInfractionQueues(infraction, duration);

        const [updatedInfraction] = await this.application.database.drizzle
            .update(infractions)
            .set({
                expiresAt: duration?.fromNow() ?? null,
                metadata: { duration: duration?.toMilliseconds() ?? undefined }
            })
            .where(
                and(eq(infractions.id, id), eq(infractions.guildId, guildId))
            )
            .returning();

        if (notify) {
            const user = await fetchUser(
                this.application.getClient(),
                infraction.userId
            );
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
                                        value:
                                            duration?.toString() ?? "Indefinite"
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

    public getLocalAttachmentPath(attachment: string) {
        const storagePath = systemPrefix("storage/attachments", true);
        return path.join(storagePath, attachment);
    }

    public async deleteById(
        guildId: Snowflake,
        id: number
    ): Promise<Infraction | undefined> {
        const infraction = (
            await this.application.database.drizzle
                .delete(infractions)
                .where(
                    and(
                        eq(infractions.id, id),
                        eq(infractions.guildId, guildId)
                    )
                )
                .returning()
        )[0];

        if (!infraction) {
            return undefined;
        }

        if (
            [
                InfractionType.Ban,
                InfractionType.Mute,
                InfractionType.Role
            ].includes(infraction.type)
        ) {
            await this.updateInfractionQueues(infraction, null);
        }

        await this.deleteAttachments(infraction.attachments);
        return infraction;
    }

    private async deleteAttachments(attachments: string[]) {
        const attachmentStoragePath = systemPrefix("storage/attachments", true);

        for (const file of attachments) {
            const filePath = path.join(attachmentStoragePath, file);

            if (existsSync(filePath)) {
                await unlink(filePath).catch(this.application.logger.error);
            }
        }
    }

    public async deleteForUser(
        guildId: Snowflake,
        userId: string,
        type?: InfractionType
    ): Promise<number> {
        const returnedInfractions = await this.application.database.drizzle
            .delete(infractions)
            .where(
                and(
                    eq(infractions.userId, userId),
                    eq(infractions.guildId, guildId),
                    type ? eq(infractions.type, type) : undefined
                )
            )
            .returning();

        if (!returnedInfractions.length) {
            return 0;
        }

        const attachmentStoragePath = systemPrefix("storage/attachments", true);

        for (const infraction of returnedInfractions) {
            if (
                [
                    InfractionType.Ban,
                    InfractionType.Mute,
                    InfractionType.Role
                ].includes(infraction.type)
            ) {
                this.updateInfractionQueues(infraction, null).catch(
                    this.application.logger.error
                );
            }

            for (const file of infraction.attachments) {
                const filePath = path.join(attachmentStoragePath, file);

                if (existsSync(filePath)) {
                    unlink(filePath).catch(this.application.logger.error);
                }
            }
        }

        return returnedInfractions.length;
    }

    public async getUserInfractions(
        guildId: Snowflake,
        id: Snowflake
    ): Promise<Infraction[]> {
        return await this.application.database.query.infractions.findMany({
            where: and(
                eq(infractions.userId, id),
                eq(infractions.guildId, guildId)
            )
        });
    }

    public prettifyInfractionType(type: InfractionType) {
        switch (type) {
            case InfractionType.Ban:
                return "Ban";
            case InfractionType.MassBan:
                return "Mass Ban";
            case InfractionType.Kick:
                return "Kick";
            case InfractionType.MassKick:
                return "Mass Kick";
            case InfractionType.Mute:
                return "Mute";
            case InfractionType.Unmute:
                return "Unmute";
            case InfractionType.Warning:
                return "Warning";
            case InfractionType.Bean:
                return "Bean";
            case InfractionType.Note:
                return "Note";
            case InfractionType.BulkDeleteMessage:
                return "Bulk Message Deletion";
            case InfractionType.Timeout:
                return "Timeout";
            case InfractionType.TimeoutRemove:
                return "Timeout Remove";
            case InfractionType.Role:
                return "Role Modification";
            case InfractionType.ModMessage:
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
            attachments,
            notify = true
        } = payload;
        const infraction: Infraction = await this.createInfraction({
            guildId,
            moderator,
            reason,
            transformNotificationEmbed,
            type: InfractionType.Bean,
            user,
            notify,
            attachments
        });

        return {
            status: "success",
            infraction,
            overviewEmbed: (generateOverviewEmbed
                ? this.createOverviewEmbed(infraction, user, moderator)
                : undefined) as E extends true ? APIEmbed : undefined
        };
    }

    public async createShot<E extends boolean>(
        payload: CreateShotPayload<E>
    ): Promise<InfractionCreateResult<E>> {
        const {
            moderator,
            user,
            reason,
            guildId,
            generateOverviewEmbed,
            transformNotificationEmbed,
            attachments,
            notify = true
        } = payload;

        const infraction: Infraction = {
            id: Math.round(Math.random() * 5000),
            guildId,
            moderatorId: moderator.id,
            userId: user.id,
            reason: this.processReason(guildId, reason),
            type: InfractionType.Shot,
            deliveryStatus: InfractionDeliveryStatus.NotDelivered,
            createdAt: new Date(),
            queueId: null,
            updatedAt: new Date(),
            expiresAt: null,
            metadata: null,
            attachments:
                attachments?.map(attachment =>
                    typeof attachment === "string"
                        ? attachment
                        : attachment.proxyURL
                ) ?? []
        };

        if (notify) {
            const status = await this.notify(
                user,
                infraction,
                transformNotificationEmbed,
                true
            ); // *trollface*
            infraction.deliveryStatus =
                status === "notified"
                    ? InfractionDeliveryStatus.Success
                    : status === "fallback"
                      ? InfractionDeliveryStatus.Fallback
                      : InfractionDeliveryStatus.Failed;
        }

        return {
            status: "success",
            infraction,
            overviewEmbed: (generateOverviewEmbed
                ? this.createOverviewEmbed(infraction, user, moderator)
                : undefined) as E extends true ? APIEmbed : undefined
        };
    }

    public async createFakeBan<E extends boolean>(
        payload: CreateBanPayload<E>
    ): Promise<InfractionCreateResult<E>> {
        const guild = this.getGuild(payload.guildId);

        if (!guild) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                code: 0
            };
        }

        const {
            moderator,
            user,
            reason,
            guildId,
            generateOverviewEmbed,
            transformNotificationEmbed,
            notify = true,
            duration,
            deletionTimeframe,
            attachments
        } = payload;

        const infraction: Infraction = {
            id: Math.round(Math.random() * 5000),
            guildId,
            moderatorId: moderator.id,
            userId: user.id,
            reason: this.processReason(guildId, reason),
            type: InfractionType.Ban,
            deliveryStatus: InfractionDeliveryStatus.NotDelivered,
            createdAt: new Date(),
            expiresAt: duration?.fromNow() ?? null,
            metadata: {
                deletionTimeframe: deletionTimeframe?.fromNowMilliseconds(),
                duration: duration?.fromNowMilliseconds()
            },
            queueId: 0,
            updatedAt: new Date(),
            attachments:
                attachments?.map(attachment =>
                    typeof attachment === "string"
                        ? attachment
                        : attachment.proxyURL
                ) ?? []
        };

        if (notify) {
            const status = await this.notify(
                user,
                infraction,
                transformNotificationEmbed,
                true
            ); // *trollface*
            infraction.deliveryStatus =
                status === "notified"
                    ? InfractionDeliveryStatus.Success
                    : status === "fallback"
                      ? InfractionDeliveryStatus.Fallback
                      : InfractionDeliveryStatus.Failed;
        }

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

    public async createBan<E extends boolean>(
        payload: CreateBanPayload<E>
    ): Promise<InfractionCreateResult<E>> {
        const guild = this.getGuild(payload.guildId);

        if (!guild) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                code: 0
            };
        }

        const {
            moderator,
            user,
            reason,
            guildId,
            generateOverviewEmbed,
            transformNotificationEmbed,
            notify = true,
            immediateUnban = false,
            attachments
        } = payload;
        const infraction: Infraction = await this.createInfraction({
            guildId,
            moderator,
            reason,
            transformNotificationEmbed,
            type: InfractionType.Ban,
            user,
            notify,
            attachments,
            payload: {
                expiresAt: payload.duration?.fromNow(),
                metadata: {
                    deletionTimeframe:
                        payload.deletionTimeframe?.fromNowMilliseconds(),
                    duration: payload.duration?.fromNowMilliseconds(),
                    softban: immediateUnban
                }
            }
        });

        try {
            try {
                await guild.bans.create(user, {
                    reason: `${moderator.username} - ${infraction.reason ?? "No reason provided"}`,
                    deleteMessageSeconds: payload.deletionTimeframe
                        ? payload.deletionTimeframe.toSeconds("floor")
                        : undefined
                });
            } catch (error) {
                if (isDiscordAPIError(error)) {
                    return this.createError({
                        status: "failed",
                        infraction: null,
                        overviewEmbed: null,
                        errorType: "api_error",
                        code: +error.code
                    });
                }

                throw error;
            }

            if (immediateUnban) {
                try {
                    await guild.bans.remove(
                        user,
                        `${moderator.username} - ${infraction.reason ?? "No reason provided"}`
                    );
                } catch (error) {
                    if (isDiscordAPIError(error)) {
                        return this.createError({
                            status: "failed",
                            infraction: null,
                            overviewEmbed: null,
                            errorType: "api_error_unban",
                            code: +error.code
                        });
                    }

                    throw error;
                }
            }

            await this.queueService.bulkCancel(UnbanQueue, queue => {
                return (
                    queue.data.userId === user.id &&
                    queue.data.guildId === guild.id
                );
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
                overviewEmbed: null,
                code: 0
            };
        }

        this.auditLoggingService
            .emitLogEvent(guildId, LogEventType.MemberBanAdd, {
                guild,
                user,
                moderator,
                reason,
                infractionId: infraction.id,
                duration: payload.duration,
                deletionTimeframe: payload.deletionTimeframe
            })
            .catch(this.application.logger.error);

        const overviewEmbed = generateOverviewEmbed
            ? this.createOverviewEmbed(infraction, user, moderator, {
                  duration: payload.duration
              })
            : undefined;

        if (overviewEmbed && immediateUnban) {
            overviewEmbed.fields ??= [];
            overviewEmbed.fields.push({
                name: "Ban Type",
                value: "Soft-ban"
            });
        }

        return {
            status: "success",
            infraction,
            overviewEmbed: overviewEmbed as E extends true
                ? APIEmbed
                : undefined
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
                code: 0
            };
        }

        const {
            moderator,
            user,
            reason: rawReason,
            guildId,
            generateOverviewEmbed,
            transformNotificationEmbed,
            attachments
        } = payload;
        const reason = this.processReason(guildId, rawReason) ?? rawReason;

        try {
            await guild.bans.remove(
                user,
                `${moderator.username} - ${reason ?? "No reason provided"}`
            );
        } catch (error) {
            this.application.logger.error(error);

            if (isDiscordAPIError(error)) {
                return this.createError({
                    status: "failed",
                    infraction: null,
                    overviewEmbed: null,
                    errorType:
                        error.code === 10026 ? "unknown_ban" : "api_Error",
                    code: +error.code
                });
            }

            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                errorType: "unban_failed",
                code: 0
            };
        }

        const infraction: Infraction = await this.createInfraction({
            guildId,
            moderator,
            reason,
            transformNotificationEmbed,
            type: InfractionType.Unban,
            user,
            notify: false,
            processReason: false,
            attachments
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
                errorType: "queue_cancel_failed",
                code: 0
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
            notify = true,
            attachments
        } = payload;

        const guild = this.getGuild(payload.guildId);

        if (!guild || !member.kickable) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                code: 0
            };
        }

        const infraction: Infraction = await this.createInfraction({
            guildId,
            moderator,
            reason,
            transformNotificationEmbed,
            type: InfractionType.Kick,
            user: member.user,
            notify,
            attachments
        });

        try {
            await member.kick(
                `${moderator.username} - ${infraction.reason ?? "No reason provided"}`
            );
        } catch (error) {
            this.application.logger.error(error);

            if (isDiscordAPIError(error)) {
                return this.createError({
                    status: "failed",
                    infraction: null,
                    overviewEmbed: null,
                    errorType: "api_error",
                    code: +error.code
                });
            }

            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                code: 0
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
            notify = true,
            roleTakeout = false,
            attachments
        } = payload;
        let { mode } = payload;
        const guild = this.getGuild(payload.guildId);

        if (
            (channel && !clearMessagesCount) ||
            (clearMessagesCount && !channel)
        ) {
            throw new Error("Must provide both channel and clearMessagesCount");
        }

        if (!guild) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                code: 0
            };
        }

        const config = this.configManager.config[guildId]?.muting;
        const role =
            config?.role && mode !== "timeout" ? config?.role : undefined;

        if (!role && mode === "role") {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                errorType: "role_not_found",
                errorDescription: "Muted role not found!",
                code: 0
            };
        }

        mode ??= role ? "role" : "timeout";

        if (mode === "timeout" && member.user.bot) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                errorType: "cannot_mute_a_bot",
                errorDescription: "Cannot mute a bot in timeout mode!",
                code: 0
            };
        }

        if (mode === "timeout" && !member.moderatable) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                errorType: "cannot_moderate",
                errorDescription: "This member cannot be moderated by me!",
                code: 0
            };
        }

        if (mode === "timeout" && !duration) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                errorType: "invalid_duration",
                errorDescription: "Must provide duration when timing out!",
                code: 0
            };
        }

        if (
            mode === "timeout" &&
            (duration?.toMilliseconds() ?? 0) >= 28 * 24 * 60 * 60 * 1000
        ) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                errorType: "invalid_duration",
                errorDescription:
                    "Duration must be less than 28 days when timing out!",
                code: 0
            };
        }

        if (mode === "role" && !member.manageable) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                errorType: "cannot_manage",
                errorDescription: "This member cannot be managed by me!",
                code: 0
            };
        }

        if (
            (mode === "role" && member.roles.cache.has(role!)) ||
            (mode === "timeout" && member.isCommunicationDisabled())
        ) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                errorType: "already_muted",
                errorDescription: "This member is already muted.",
                code: 0
            };
        }

        const reason = this.processReason(guildId, rawReason) ?? rawReason;
        let rolesTaken = roleTakeout
            ? member.roles.cache.map(r => r.id)
            : undefined;

        if (rolesTaken && !member.manageable) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                errorType: "cannot_manage",
                errorDescription:
                    "This member cannot be managed by me, so I cannot take their roles!",
                code: 0
            };
        }

        try {
            if (mode === "timeout" && duration) {
                await member.timeout(
                    duration.toMilliseconds(),
                    `${moderator.username} - ${reason}`
                );
            } else if (mode === "role" && role) {
                await member.roles.add(
                    role,
                    `${moderator.username} - ${reason}`
                );
            } else {
                throw new Error("Unreachable");
            }

            if (rolesTaken) {
                try {
                    await member.roles.set(
                        [],
                        `${moderator.username} - ${reason}`
                    );
                } catch (error) {
                    this.application.logger.error(error);
                    rolesTaken = [];
                }
            }
        } catch (error) {
            this.application.logger.error(error);

            if (isDiscordAPIError(error)) {
                return this.createError({
                    status: "failed",
                    infraction: null,
                    overviewEmbed: null,
                    errorType: "api_error",
                    code: +error.code
                });
            }

            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                code: 0
            };
        }

        const infraction: Infraction = await this.createInfraction({
            guildId,
            moderator,
            reason,
            transformNotificationEmbed,
            type: InfractionType.Mute,
            user: member.user,
            notify,
            attachments,
            payload: {
                metadata: {
                    type: role ? "role" : "timeout",
                    duration: duration?.fromNowMilliseconds(),
                    roles_taken: rolesTaken
                },
                expiresAt: duration ? duration.fromNow() : undefined
            },
            processReason: false
        });

        await this.recordMute(member, rolesTaken ?? []);

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
                overviewEmbed: null,
                code: 0
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
            attachments
        } = payload;
        const { mode = "auto" } = payload;
        const config = this.configManager.config[guildId]?.muting;
        const role =
            config?.role && mode !== "timeout" ? config?.role : undefined;
        const finalMode = mode === "auto" ? (role ? "role" : "timeout") : mode;

        if (finalMode === "role" && !member.manageable) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                errorType: "permission",
                errorDescription: "Member is not manageable by me!",
                code: 0
            };
        }

        if (finalMode === "timeout" && !member.moderatable) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                errorType: "permission",
                errorDescription: "Member is not moderatable by me!",
                code: 0
            };
        }

        if (!role && finalMode === "role") {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                errorType: "role_not_found",
                errorDescription: "Muted role not found!",
                code: 0
            };
        }

        if (
            (finalMode === "role" && role && !member.roles.cache.has(role)) ||
            (finalMode === "timeout" &&
                !member.communicationDisabledUntilTimestamp)
        ) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                errorType: "not_muted",
                errorDescription: "This member is not muted!",
                code: 0
            };
        }

        const reason = this.processReason(guildId, rawReason) ?? rawReason;

        try {
            if (
                finalMode === "timeout" &&
                member.communicationDisabledUntilTimestamp &&
                member.moderatable
            ) {
                await member.disableCommunicationUntil(
                    null,
                    `${moderator.username} - ${reason}`
                );
            }

            if (finalMode === "role" && role && member.roles.cache.has(role)) {
                await member.roles.remove(
                    role,
                    `${moderator.username} - ${reason}`
                );
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

            if (isDiscordAPIError(error)) {
                return this.createError({
                    status: "failed",
                    infraction: null,
                    overviewEmbed: null,
                    errorType: "api_error",
                    code: +error.code
                });
            }

            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                code: 0
            };
        }

        const infraction: Infraction = await this.createInfraction({
            guildId,
            moderator,
            reason,
            transformNotificationEmbed,
            type: InfractionType.Unmute,
            user: member.user,
            notify,
            attachments,
            payload: {
                metadata: {
                    finalMode
                }
            },
            processReason: false
        });

        const records =
            await this.application.database.query.muteRecords.findMany({
                where: and(
                    eq(muteRecords.memberId, member.id),
                    eq(muteRecords.guildId, guild.id)
                )
            });

        let roleRestoreSuccess = true;

        if (records?.length) {
            try {
                await member.roles.add(
                    records[0].roles,
                    `${moderator.username} - ${reason}`
                );
            } catch (error) {
                this.application.logger.error(error);
                roleRestoreSuccess = false;
            }

            this.application.database.drizzle
                .delete(infractions)
                .where(
                    inArray(
                        infractions.id,
                        records.map(r => r.id)
                    )
                )
                .then()
                .catch(this.application.logger.error);
        }

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
                ? also(
                      this.createOverviewEmbed(
                          infraction,
                          member.user,
                          moderator
                      ),
                      embed => {
                          if (!roleRestoreSuccess) {
                              embed.fields.push({
                                  name: "Role Restoration",
                                  value: "Failed to restore roles"
                              });
                          }
                      }
                  )
                : undefined) as E extends true ? APIEmbed : undefined
        };
    }

    public async recordMute(member: GuildMember, roles: Snowflake[]) {
        await this.application.database.drizzle
            .delete(muteRecords)
            .where(
                and(
                    eq(muteRecords.memberId, member.id),
                    eq(muteRecords.guildId, member.guild.id)
                )
            );

        await this.application.database.drizzle.insert(muteRecords).values({
            memberId: member.id,
            guildId: member.guild.id,
            roles
        });
    }

    public async reapplyMuteIfNeeded(member: GuildMember) {
        const config = this.configManager.config[member.guild.id]?.muting;
        const role = config?.role;

        if (!role) {
            return;
        }

        const existing =
            await this.application.database.query.muteRecords.findFirst({
                where: and(
                    eq(muteRecords.memberId, member.id),
                    eq(muteRecords.guildId, member.guild.id)
                )
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
                overviewEmbed: null,
                code: 0
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
            duration,
            attachments
        } = payload;

        if (!member.manageable) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                errorType: "permission",
                errorDescription: "Member is not manageable by me!",
                code: 0
            };
        }

        const reason = this.processReason(guildId, rawReason) ?? rawReason;

        try {
            if (mode === "give") {
                await member.roles.add(
                    roles,
                    `${moderator.username} - ${reason}`
                );
            } else {
                await member.roles.remove(
                    roles,
                    `${moderator.username} - ${reason}`
                );
            }
        } catch (error) {
            this.application.logger.error(error);

            if (isDiscordAPIError(error)) {
                return this.createError({
                    status: "failed",
                    infraction: null,
                    overviewEmbed: null,
                    errorType: "api_error",
                    code: +error.code
                });
            }

            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                code: 0
            };
        }

        const infraction: Infraction = await this.createInfraction({
            guildId,
            moderator,
            reason,
            transformNotificationEmbed,
            type: InfractionType.Role,
            user: member.user,
            notify,
            attachments,
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

        if (duration) {
            await this.queueService
                .create(RoleQueue, {
                    data: {
                        memberId: member.id,
                        guildId: guild.id,
                        roleIds: roles.map(role =>
                            typeof role === "string" ? role : role.id
                        ),
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
                .slice(2) +
            (roles.length > 8 ? " **+ " + (roles.length - 8) + " more**" : "");

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
                added:
                    mode === "give"
                        ? roles.map(r => (r instanceof Role ? r.id : r))
                        : undefined,
                removed:
                    mode === "take"
                        ? roles.map(r => (r instanceof Role ? r.id : r))
                        : undefined,
                guild
            })
            .catch(this.application.logger.error);

        return {
            status: "success",
            infraction,
            overviewEmbed: overviewEmbed as E extends true
                ? APIEmbed
                : undefined
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
            filters = [],
            attachments,
            beforeId
        } = payload;

        if (!user && !count) {
            throw new Error("Must provide either user or count");
        }

        if (count && count > 100) {
            throw new Error(
                "Cannot bulk delete more than 100 messages at once"
            );
        }

        const guild = this.getGuild(payload.guildId);

        if (!guild) {
            return {
                status: "failed",
                overviewEmbed: null,
                code: 0
            };
        }

        let infraction: Infraction | undefined;

        if (user) {
            infraction = await this.createInfraction({
                guildId,
                moderator,
                reason,
                transformNotificationEmbed,
                type: InfractionType.BulkDeleteMessage,
                user,
                notify: false,
                attachments
            });
        }

        const finalFilters = [...filters];
        let finalCount: number = 0;

        if (user) {
            finalFilters.push(
                (message: Message) => message.author.id === user.id
            );
        }

        let deletedMessages:
            | Collection<Snowflake, Message | PartialMessage | undefined>
            | undefined;

        try {
            const messages = await channel.messages.fetch({
                limit: count ?? 100,
                before: beforeId
            });
            const messagesToDelete = [];

            addMessagesLoop: for (const message of messages.values()) {
                if (finalFilters.length === 0) {
                    messagesToDelete.push(message);
                    continue;
                }

                for (const filter of finalFilters) {
                    if (!(await filter(message))) {
                        continue addMessagesLoop;
                    }
                }

                messagesToDelete.push(message);
            }

            if (messagesToDelete.length > 0) {
                deletedMessages = await channel.bulkDelete(
                    messagesToDelete,
                    true
                );
                finalCount = deletedMessages.size;
            }
        } catch (error) {
            this.application.logger.error(error);

            if (isDiscordAPIError(error)) {
                const code = +error.code;

                return {
                    status: "failed",
                    overviewEmbed: null,
                    errorType: "api_error",
                    code,
                    errorDescription: APIErrors.translateToMessage(code)
                };
            }

            return {
                status: "failed",
                overviewEmbed: null,
                code: 0
            };
        }

        if (respond) {
            const message = await channel
                .send({
                    content: `${emoji(this.application, "check")} Cleared ${bold(
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
            count: finalCount,
            infraction
        };
    }

    public async createClearMessageReactions(
        payload: CreateClearMessageReactionsPayload<false>
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
            attachments
        } = payload;

        if (!user && !count) {
            throw new Error("Must provide either user or count");
        }

        if (count && count > 100) {
            throw new Error(
                "Cannot bulk delete more than 100 messages at once"
            );
        }

        const guild = this.getGuild(payload.guildId);

        if (!guild) {
            return {
                status: "failed",
                overviewEmbed: null,
                code: 0
            };
        }

        let infraction: Infraction | undefined;

        if (user) {
            infraction = await this.createInfraction({
                guildId,
                moderator,
                reason,
                transformNotificationEmbed,
                type: InfractionType.ReactionClear,
                user,
                notify: false,
                attachments
            });
        }

        const deletedReactions = [];

        try {
            const messages = await channel.messages.fetch({
                limit: count ?? 100
            });

            for (const message of messages.values()) {
                if (message.reactions.cache.size === 0) {
                    continue;
                }

                for (const reaction of message.reactions.cache.values()) {
                    if (user && !reaction.users.cache.has(user.id)) {
                        continue;
                    }

                    if (user) {
                        reaction.users
                            .remove(user.id)
                            .catch(this.application.logger.error);
                    } else {
                        reaction.remove().catch(this.application.logger.error);
                    }

                    deletedReactions.push(reaction);
                }
            }
        } catch (error) {
            this.application.logger.error(error);

            if (isDiscordAPIError(error)) {
                const code = +error.code;

                return {
                    status: "failed",
                    overviewEmbed: null,
                    errorType: "api_error",
                    code,
                    errorDescription: APIErrors.translateToMessage(code)
                };
            }

            return {
                status: "failed",
                overviewEmbed: null,
                code: 0
            };
        }

        if (respond) {
            const message = await channel
                .send({
                    content: `${emoji(this.application, "check")} Cleared ${bold(
                        deletedReactions.length.toString()
                    )} message reactions${user ? ` from user ${bold(user.username)}` : ""}`
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
            .emitLogEvent(guildId, LogEventType.MessageReactionClear, {
                user,
                moderator,
                reason,
                infractionId: infraction?.id,
                channel,
                reactions: deletedReactions
            })
            .catch(this.application.logger.error);

        return {
            status: "success",
            count: deletedReactions.length,
            infraction
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
            attachments,
            notify = true
        } = payload;

        const guild = this.getGuild(payload.guildId);

        if (!guild) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                code: 0
            };
        }

        const infraction: Infraction = await this.createInfraction({
            guildId,
            moderator,
            reason,
            transformNotificationEmbed,
            type: InfractionType.Warning,
            user: member.user,
            notify,
            attachments
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
            notify = true,
            attachments
        } = payload;

        const guild = this.getGuild(payload.guildId);

        if (!guild) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                code: 0
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
                type: InfractionType.ModMessage,
                user: member.user,
                notify,
                attachments,
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
                    ? this.createOverviewEmbed(
                          infraction,
                          member.user,
                          moderator
                      )
                    : undefined) as E extends true ? APIEmbed : undefined
            };
        } catch {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                code: 0
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
            transformNotificationEmbed,
            attachments
        } = payload;

        const guild = this.getGuild(payload.guildId);

        if (!guild) {
            return {
                status: "failed",
                infraction: null,
                overviewEmbed: null,
                code: 0
            };
        }

        const infraction: Infraction = await this.createInfraction({
            guildId,
            moderator,
            reason,
            transformNotificationEmbed,
            type: InfractionType.Note,
            user,
            notify: false,
            attachments
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
                name:
                    infraction.type === InfractionType.Shot
                        ? "Patient"
                        : "User",
                value: userInfo(user)
            },
            {
                name:
                    infraction.type === InfractionType.Shot
                        ? "💉 Doctor"
                        : "Moderator",
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
            infraction.deliveryStatus !== InfractionDeliveryStatus.Success &&
            includeNotificationStatusInEmbed
        ) {
            fields.push({
                name: "Notification",
                value:
                    infraction.deliveryStatus ===
                    InfractionDeliveryStatus.Failed
                        ? "Failed to deliver a DM to this user."
                        : infraction.deliveryStatus ===
                            InfractionDeliveryStatus.Fallback
                          ? "Sent to fallback channel."
                          : "Not delivered."
            });
        }

        if (infraction.attachments.length) {
            fields.push({
                name: "Attachments",
                value: `**${infraction.attachments.length}** file${infraction.attachments.length === 1 ? "" : "s"}`
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
                infraction.type === InfractionType.Role
                    ? `Roles for ${bold(user.username)} have been updated.`
                    : `${bold(user.username)} has been ${actionDoneName}.`,
            fields,
            timestamp: new Date().toISOString(),
            color:
                actionDoneName.startsWith("un") ||
                infraction.type === InfractionType.Bean ||
                infraction.type === InfractionType.Shot
                    ? Colors.Green
                    : Colors.Red
        } satisfies APIEmbed;
    }

    public async createUserMassBan(payload: CreateUserMassBanPayload) {
        const {
            moderator,
            users: userResolvables,
            guildId,
            deletionTimeframe,
            duration,
            onMassBanComplete,
            onMassBanStart,
            onError,
            attachments
        } = payload;
        let { reason } = payload;

        reason = this.processReason(guildId, reason) ?? reason;

        const guild = this.getGuild(payload.guildId);

        if (!guild) {
            return {
                status: "failed"
            };
        }

        if (userResolvables.length > 200) {
            return {
                status: "failed",
                errorType: "too_many_users"
            };
        }

        const attachmentFileLocalNames = attachments
            ? await this.saveAttachments(attachments)
            : [];

        await onMassBanStart?.();

        const bannedUsers: Snowflake[] = [];
        const failedUsers: Snowflake[] = [];
        const allUsers = userResolvables.map(resolvable =>
            typeof resolvable === "string" ? resolvable : resolvable.id
        );
        const infractionCreatePayloads: InfractionCreatePayload[] = [];

        try {
            const response = (await this.client.rest.post(
                `/guilds/${encodeURIComponent(guild.id)}/bulk-ban`,
                {
                    reason: `${moderator.username} - ${reason ?? "No reason provided"}`,
                    body: {
                        user_ids: allUsers,
                        delete_message_seconds:
                            deletionTimeframe?.toSeconds("floor")
                    }
                }
            )) as {
                banned_users: Snowflake[];
                failed_users: Snowflake[];
            };

            bannedUsers.push(...response.banned_users);
            failedUsers.push(...response.failed_users);
        } catch (error) {
            this.application.logger.error("Bulk ban error", error);

            if (error instanceof DiscordAPIError && error.code === 500000) {
                suppressErrorNoReturn(onError?.("failed_to_ban"));
                suppressErrorNoReturn(
                    onMassBanComplete?.([], allUsers, allUsers, "failed_to_ban")
                );

                return {
                    status: "failed",
                    errorType: "failed_to_ban"
                };
            }

            suppressErrorNoReturn(onError?.("bulk_ban_failed"));
            suppressErrorNoReturn(
                onMassBanComplete?.([], allUsers, allUsers, "bulk_ban_failed")
            );

            return {
                status: "failed",
                errorType: "bulk_ban_failed"
            };
        }

        for (const userId of bannedUsers) {
            infractionCreatePayloads.push({
                guildId,
                moderatorId: moderator.id,
                type: InfractionType.MassBan,
                userId,
                reason,
                expiresAt: duration?.fromNow(),
                attachments: attachmentFileLocalNames,
                metadata: {
                    deletionTimeframe: deletionTimeframe?.fromNowMilliseconds(),
                    duration: duration?.fromNowMilliseconds()
                },
                deliveryStatus: InfractionDeliveryStatus.NotDelivered
            });
        }

        if (infractionCreatePayloads.length > 0) {
            this.application.database.drizzle
                .insert(infractions)
                .values(infractionCreatePayloads)
                .then()
                .catch(this.application.logger.error);
        }

        this.auditLoggingService
            .emitLogEvent(guildId, LogEventType.MemberMassBan, {
                guild,
                moderator,
                reason,
                users: bannedUsers,
                deletionTimeframe,
                duration
            })
            .catch(this.application.logger.error);

        if (duration) {
            this.queueService.create(MassUnbanQueue, {
                data: {
                    guildId,
                    userIds: bannedUsers
                },
                guildId,
                runsAt: duration.fromNow()
            });
        }

        await onMassBanComplete?.(bannedUsers, failedUsers, allUsers);
        return {
            status: "success"
        };
    }

    public async createUserMassKick(payload: CreateUserMassKickPayload) {
        const {
            moderator,
            guildId,
            members: memberResolvables,
            onKickAttempt,
            onInvalidMember,
            onKickFail,
            onKickSuccess,
            onMassKickComplete,
            onMassKickStart,
            attachments
        } = payload;
        let { reason } = payload;

        reason = this.processReason(guildId, reason) ?? reason;

        const guild = this.getGuild(payload.guildId);

        if (!guild) {
            return {
                status: "failed"
            };
        }

        const attachmentFileLocalNames = attachments
            ? await this.saveAttachments(attachments)
            : [];
        await onMassKickStart?.();

        const members: GuildMember[] = [];
        const memberIds: Snowflake[] = [];
        const infractionCreatePayloads: InfractionCreatePayload[] = [];

        await Promise.all(
            memberResolvables.map(async resolvable => {
                await onKickAttempt?.(
                    typeof resolvable === "string" ? resolvable : resolvable.id
                );

                const member =
                    typeof resolvable === "string"
                        ? await fetchMember(guild, resolvable)
                        : resolvable;

                if (!member) {
                    await onInvalidMember?.(
                        typeof resolvable === "string"
                            ? resolvable
                            : resolvable.id
                    );
                    return;
                }

                members.push(member);
                memberIds.push(member.id);

                try {
                    if (!member.kickable) {
                        throw new Error("Member is not kickable");
                    }

                    await member.kick(
                        `${moderator.username} - ${reason ?? "No reason provided"}`
                    );
                    await onKickSuccess?.(member);

                    infractionCreatePayloads.push({
                        guildId,
                        moderatorId: moderator.id,
                        type: InfractionType.MassKick,
                        userId: member.id,
                        reason,
                        attachments: attachmentFileLocalNames,
                        deliveryStatus: InfractionDeliveryStatus.NotDelivered
                    });
                } catch (error) {
                    this.application.logger.error(error);
                    await onKickFail?.(member);
                }
            })
        );

        if (infractionCreatePayloads.length > 0) {
            this.application.database.drizzle
                .insert(infractions)
                .values(infractionCreatePayloads)
                .then()
                .catch(this.application.logger.error);
        }

        this.auditLoggingService
            .emitLogEvent(guildId, LogEventType.MemberMassKick, {
                guild,
                moderator,
                reason,
                members
            })
            .catch(this.application.logger.error);

        await onMassKickComplete?.(members);

        return {
            status: "success"
        };
    }

    public async generatePlainTextExport({
        columnsToInclude,
        guild,
        user,
        onlyNotified = false
    }: GeneratePlainTextExportOptions) {
        const infractionList =
            await this.application.database.query.infractions.findMany({
                where: and(
                    eq(infractions.guildId, guild.id),
                    eq(infractions.userId, user.id),
                    onlyNotified
                        ? not(
                              eq(
                                  infractions.deliveryStatus,
                                  InfractionDeliveryStatus.NotDelivered
                              )
                          )
                        : undefined
                )
            });

        const table = new AsciiTable3("Infractions");

        table.setHeading(
            ...columnsToInclude.map(column => {
                switch (column) {
                    case "id":
                        return "ID";
                    case "type":
                        return "Type";
                    case "userId":
                        return "User ID";
                    case "reason":
                        return "Reason";
                    case "createdAt":
                        return "Created At";
                    case "expiresAt":
                        return "Expires At";
                    case "metadata":
                        return "Metadata";
                    case "deliveryStatus":
                        return "Delivery Status";
                    case "duration":
                        return "Duration";
                    case "updatedAt":
                        return "Updated At";
                    case "moderatorId":
                        return "Moderator ID";
                    case "attachments":
                        return "Attachments";
                    default:
                        throw new Error("Invalid column");
                }
            })
        );

        for (const infraction of infractionList) {
            const row: (string | Date | number | null)[] = columnsToInclude.map(
                column => {
                    switch (column) {
                        case "id":
                            return infraction.id;
                        case "type":
                            return this.prettifyInfractionType(infraction.type);
                        case "userId":
                            return infraction.userId;
                        case "moderatorId":
                            return infraction.moderatorId;
                        case "reason":
                            return infraction.reason ?? "None";
                        case "createdAt":
                            return infraction.createdAt;
                        case "updatedAt":
                            return infraction.updatedAt;
                        case "expiresAt":
                            return infraction.expiresAt ?? "Never";
                        case "metadata":
                            return JSON.stringify(infraction.metadata);
                        case "duration":
                            return infraction.expiresAt
                                ? formatDistanceStrict(
                                      infraction.expiresAt,
                                      infraction.createdAt
                                  )
                                : "None";
                        case "deliveryStatus":
                            return infraction.deliveryStatus;
                        case "attachments":
                            return infraction.attachments.length > 0
                                ? `${infraction.attachments.length} total\n` +
                                      infraction.attachments.join("\n")
                                : "None";
                        default:
                            throw new Error("Invalid column");
                    }
                }
            );

            table.addRow(...row);
        }

        return { output: table.toString(), count: infractionList.length };
    }

    public async getUserValidInfractions(
        guildId: Snowflake,
        userId: Snowflake
    ) {
        return await this.application.database.query.infractions.findMany({
            where: and(
                eq(infractions.guildId, guildId),
                eq(infractions.userId, userId),
                inArray(
                    infractions.type,
                    Object.keys(this.typeToPointKeyMap) as InfractionType[]
                )
            )
        });
    }

    public async getInfractionStatistics(
        guildId: Snowflake,
        userId: Snowflake
    ): Promise<InfractionStatistics | null> {
        type Key = keyof NonNullable<GuildConfig["infractions"]>["points"];
        const infractions = await this.getUserInfractions(guildId, userId);
        const config = this.configManager.config[guildId]?.infractions;

        if (!config) {
            return null;
        }

        let points = 0;
        const pointRecord: Record<Key, number> = {
            ban: 0,
            mute: 0,
            clear: 0,
            kick: 0,
            massban: 0,
            masskick: 0,
            note: 0,
            role: 0,
            tempban: 0,
            mod_message: 0,
            softban: 0,
            timeout: 0,
            unban: 0,
            warning: 0,
            reaction_clear: 0
        };
        const groupedInfractions = {} as Record<Key, Infraction[] | undefined>;

        for (const infraction of infractions) {
            const type = infraction.type;

            if (!(type in this.typeToPointKeyMap)) {
                continue;
            }

            let key: Key =
                this.typeToPointKeyMap[
                    type as keyof typeof this.typeToPointKeyMap
                ];

            if (type === InfractionType.Ban) {
                if (infraction.expiresAt) {
                    key = "tempban";
                } else if (
                    typeof infraction.metadata === "object" &&
                    infraction.metadata &&
                    "softban" in infraction.metadata &&
                    infraction.metadata.softban
                ) {
                    key = "softban";
                }
            }

            points += config.points[key];
            pointRecord[key] += config.points[key];
            groupedInfractions[key] ??= [];
            groupedInfractions[key]?.push(infraction);
        }

        return {
            total: points,
            points: pointRecord,
            infractions: groupedInfractions,
            summarize: () => {
                let summary = "";
                let index = 0;
                let total = 0;
                const keys = Object.keys(groupedInfractions);

                for (const type of keys) {
                    const infractions =
                        groupedInfractions[
                            type as keyof typeof groupedInfractions
                        ];

                    if (!infractions) {
                        continue;
                    }

                    summary += `**${infractions.length}** ${type === "mod_message" ? "moderator message" : type}${index === keys.length - 1 ? "" : ", "}`;
                    index++;
                    total += infractions.length;
                }

                if (summary === "") {
                    return "**0** infractions total";
                }

                summary += ` infraction(s), **${total}** total`;
                return summary;
            },
            recommendAction: (): string => {
                if (
                    (groupedInfractions.tempban?.length ?? 0) > 1 ||
                    (groupedInfractions.softban?.length ?? 0) > 1
                ) {
                    return "Consider banning this user permanently.";
                }

                if ((groupedInfractions.kick?.length ?? 0) > 1) {
                    return (
                        "Consider temporarily banning this user, for " +
                        (groupedInfractions.kick?.length ?? 1) * 2 +
                        " day(s)."
                    );
                }

                if (
                    (groupedInfractions.mute?.length ?? 0) > 1 ||
                    (groupedInfractions.timeout?.length ?? 0) > 1
                ) {
                    return "Consider kicking or temporarily banning this user.";
                }

                if ((groupedInfractions.warning?.length ?? 0) > 1) {
                    return (
                        "Consider muting this user for " +
                        (groupedInfractions.warning?.length ?? 1) * 2 +
                        " hours(s)."
                    );
                }

                return "No action recommended";
            }
        };
    }
}

export type GeneratePlainTextExportColumn =
    | "id"
    | "type"
    | "duration"
    | "userId"
    | "moderatorId"
    | "reason"
    | "createdAt"
    | "expiresAt"
    | "metadata"
    | "updatedAt"
    | "deliveryStatus"
    | "attachments";

export type InfractionStatistics = {
    total: number;
    points: Record<
        keyof NonNullable<GuildConfig["infractions"]>["points"],
        number
    >;
    infractions: Record<
        keyof NonNullable<GuildConfig["infractions"]>["points"],
        Infraction[] | undefined
    >;
    recommendAction(): string;
    summarize(): string;
};

type GeneratePlainTextExportOptions = {
    guild: Guild;
    user: User;
    columnsToInclude: GeneratePlainTextExportColumn[];
    onlyNotified?: boolean;
};

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
    attachments?: Array<Attachment | string>;
};

type CreateBeanPayload<E extends boolean> = CommonOptions<E> & {
    user: User;
};

type CreateShotPayload<E extends boolean> = CommonOptions<E> & {
    user: User;
};

type CreateUnbanPayload<E extends boolean> = Omit<
    CommonOptions<E>,
    "notify"
> & {
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

type CreateClearMessagesPayload<E extends boolean> = Omit<
    CommonOptions<E>,
    "notify"
> & {
    user?: User;
    channel: GuildTextBasedChannel;
    count?: number;
    filters?: Array<MessageFilter>;
    respond?: boolean;
    beforeId?: Snowflake;
};

type CreateClearMessageReactionsPayload<E extends boolean> = Omit<
    CommonOptions<E>,
    "notify"
> & {
    user?: User;
    channel: GuildTextBasedChannel;
    count?: number;
    respond?: boolean;
};

type MessageFilter = (message: Message) => Awaitable<boolean>;

type CreateMutePayload<E extends boolean> = CommonOptions<E> & {
    member: GuildMember;
    duration?: Duration;
    mode?: "role" | "timeout";
    clearMessagesCount?: number;
    channel?: GuildTextBasedChannel;
    roleTakeout?: boolean;
};

type CreateUserMassBanPayload = {
    moderator: User;
    reason?: string;
    guildId: Snowflake;
    users: Array<Snowflake | User>;
    deletionTimeframe?: Duration;
    duration?: Duration;
    attachments?: Array<Attachment | string>;
    onMassBanComplete?: (
        bannedUsers: Snowflake[],
        failedUsers: Snowflake[],
        allUsers: Snowflake[],
        errorType?: string
    ) => Awaitable<void>;
    onMassBanStart?: () => Awaitable<void>;
    onError?: (type: string) => Awaitable<void>;
};

type CreateUserMassKickPayload = {
    moderator: User;
    reason?: string;
    guildId: Snowflake;
    members: Array<Snowflake | GuildMember>;
    attachments?: Array<Attachment | string>;
    onKickAttempt?: (memberId: Snowflake) => Awaitable<void>;
    onKickSuccess?: (member: GuildMember) => Awaitable<void>;
    onKickFail?: (member: GuildMember) => Awaitable<void>;
    onInvalidMember?: (memberId: Snowflake) => Awaitable<void>;
    onMassKickComplete?: (members: GuildMember[]) => Awaitable<void>;
    onMassKickStart?: () => Awaitable<void>;
};

type CreateBanPayload<E extends boolean> = CommonOptions<E> & {
    user: User;
    deletionTimeframe?: Duration;
    duration?: Duration;
    immediateUnban?: boolean;
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
          code: number;
      };

type MessageBulkDeleteResult =
    | {
          status: "success";
          count: number;
          infraction?: Infraction;
      }
    | Omit<
          Extract<InfractionCreateResult<false>, { status: "failed" }>,
          "infraction"
      >;

type InfractionCreateOptions<E extends boolean> = CommonOptions<E> & {
    payload?: Partial<Omit<InfractionCreatePayload, "type">>;
    type: InfractionType;
    callback?: (infraction: Infraction) => Awaitable<void>;
    notify?: boolean;
    sendLog?: boolean;
    processReason?: boolean;
    failIfNotNotified?: boolean;
    attachments?: Array<Attachment | string>;
} & ({ user: User } | { member: GuildMember });

type DurationUpdateResult = {
    success?: boolean;
    infraction?: Infraction;
    error?: string;
};

export default InfractionManager;
