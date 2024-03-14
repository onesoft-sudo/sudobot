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

import {
    ChannelType,
    Guild,
    GuildBasedChannel,
    PermissionFlags,
    PermissionFlagsBits,
    PermissionOverwriteOptions,
    Snowflake,
    TextChannel,
    User
} from "discord.js";
import { log, logError } from "../components/log/Logger";
import Service from "../core/Service";
import { getChannelPermissionOverride } from "../utils/utils";

export const name = "channelLockManager";

type ChannelLockOptions = {
    channels?: Snowflake[];
    channelMode?: "exclude" | "include";
    ignorePrivateChannels?: boolean;
    moderator: User;
    reason?: string;
};

export default class ChannelLockManager extends Service {
    async shouldLock(
        channels: Snowflake[],
        channel: GuildBasedChannel,
        channelMode: "exclude" | "include"
    ) {
        return (
            channels.length === 0 ||
            (channelMode === "include" && channels.includes(channel.id)) ||
            (channelMode === "exclude" && !channels.includes(channel.id))
        );
    }

    async lockGuild(
        guild: Guild,
        {
            reason,
            moderator,
            channels = [],
            channelMode = "include",
            ignorePrivateChannels = true
        }: ChannelLockOptions
    ) {
        let countSuccess = 0,
            countFailed = 0,
            countSkipped = 0,
            countInvalidChannel = 0;

        const originalPermissions = [];

        for (const [, channel] of guild.channels.cache) {
            log(channel.name);

            if (
                !this.shouldLock(channels, channel, channelMode) ||
                ![
                    ChannelType.GuildAnnouncement,
                    ChannelType.GuildCategory,
                    ChannelType.GuildText,
                    ChannelType.GuildVoice,
                    ChannelType.GuildStageVoice,
                    ChannelType.GuildForum
                ].includes(channel.type)
            ) {
                countInvalidChannel++;
                continue;
            }

            try {
                const permissionOverwrites = (
                    channel as TextChannel
                ).permissionOverwrites?.cache.get(guild.id);

                if (ignorePrivateChannels) {
                    if (permissionOverwrites?.deny.has(PermissionFlagsBits.ViewChannel, true)) {
                        log("Private channel, skipping lock");
                        countSkipped++;
                        continue;
                    }
                }

                if (permissionOverwrites?.deny.has(PermissionFlagsBits.SendMessages, true)) {
                    log("Already locked channel, skipping lock");
                    countSkipped++;
                    continue;
                }

                const permissionJson = {
                    Connect: permissionOverwrites
                        ? getChannelPermissionOverride(
                              PermissionFlagsBits.Connect,
                              permissionOverwrites
                          )
                        : null,
                    SendMessages: permissionOverwrites
                        ? getChannelPermissionOverride(
                              PermissionFlagsBits.SendMessages,
                              permissionOverwrites
                          )
                        : null,
                    SendMessagesInThreads: permissionOverwrites
                        ? getChannelPermissionOverride(
                              PermissionFlagsBits.SendMessagesInThreads,
                              permissionOverwrites
                          )
                        : null,
                    AddReactions: permissionOverwrites
                        ? getChannelPermissionOverride(
                              PermissionFlagsBits.AddReactions,
                              permissionOverwrites
                          )
                        : null
                };

                originalPermissions.push({
                    channel_id: channel.id,
                    guild_id: guild.id,
                    permissions: permissionJson
                });

                await (channel as TextChannel).permissionOverwrites?.edit(guild.id, {
                    Connect: false,
                    SendMessages: false,
                    SendMessagesInThreads: false,
                    AddReactions: false
                });

                countSuccess++;
            } catch (e) {
                logError(e);
                countFailed++;
            }
        }

        await this.client.prisma.channelLock.createMany({
            data: originalPermissions
        });

        await this.client.loggerService.logServerLockOrUnlock({
            guild,
            action: "Locked",
            moderator,
            countSuccess,
            countFailed,
            countInvalidChannel,
            countSkipped,
            reason
        });

        return {
            countSuccess,
            countFailed,
            countInvalidChannel,
            countSkipped
        };
    }

    async unlockGuild(
        guild: Guild,
        {
            channels = [],
            channelMode = "include",
            ignorePrivateChannels = true,
            force,
            moderator,
            reason
        }: ChannelLockOptions & { force?: boolean }
    ) {
        let countSuccess = 0,
            countFailed = 0,
            countSkipped = 0,
            countInvalidChannel = 0;

        const originalPermissions = force
            ? guild.channels.cache.map(c => ({ channel_id: c.id, permissions: {}, id: 0 }))
            : await this.client.prisma.channelLock.findMany({
                  where: {
                      guild_id: guild.id
                  }
              });

        for (const originalPermission of originalPermissions) {
            const channel = guild.channels.cache.get(originalPermission.channel_id);

            if (!channel) continue;

            if (
                !this.shouldLock(channels, channel, channelMode) ||
                ![
                    ChannelType.GuildAnnouncement,
                    ChannelType.GuildCategory,
                    ChannelType.GuildText,
                    ChannelType.GuildVoice,
                    ChannelType.GuildStageVoice,
                    ChannelType.GuildForum
                ].includes(channel.type)
            ) {
                countInvalidChannel++;
                continue;
            }

            try {
                const options = {
                    Connect: force
                        ? true
                        : (originalPermission.permissions! as PermissionFlags).Connect,
                    SendMessages: force
                        ? true
                        : (originalPermission.permissions! as PermissionFlags).SendMessages,
                    SendMessagesInThreads: force
                        ? true
                        : (originalPermission.permissions! as PermissionFlags)
                              .SendMessagesInThreads,
                    AddReactions: force
                        ? true
                        : (originalPermission.permissions! as PermissionFlags).AddReactions
                };

                const permissionOverwrites = (
                    channel as TextChannel
                ).permissionOverwrites?.cache.get(guild.id);

                if (ignorePrivateChannels && !force) {
                    if (permissionOverwrites?.deny.has(PermissionFlagsBits.ViewChannel, true)) {
                        log("Private channel, skipping lock");
                        countSkipped++;
                        continue;
                    }
                }

                if (permissionOverwrites)
                    await (channel as TextChannel).permissionOverwrites?.edit(
                        guild.id,
                        options as PermissionOverwriteOptions
                    );
                else
                    await (channel as TextChannel).permissionOverwrites?.create(
                        guild.id,
                        options as PermissionOverwriteOptions
                    );

                countSuccess++;
            } catch (e) {
                logError(e);
                countFailed++;
            }
        }

        log(originalPermissions);

        if (!force)
            await this.client.prisma.channelLock.deleteMany({
                where: {
                    id: {
                        in: originalPermissions.map(permission => permission.id)
                    }
                }
            });

        await this.client.loggerService.logServerLockOrUnlock({
            guild,
            action: "Unlocked",
            moderator,
            countSuccess,
            countFailed,
            countInvalidChannel,
            countSkipped,
            reason
        });

        return {
            countSuccess,
            countFailed,
            countInvalidChannel,
            countSkipped
        };
    }

    async lock(channel: TextChannel, moderator: User, reason?: string) {
        try {
            const options = {
                Connect: false,
                SendMessages: false,
                SendMessagesInThreads: false,
                AddReactions: false
            };

            const permissionOverwrites = channel.permissionOverwrites?.cache.get(channel.guild.id);

            const permissionJson = {
                Connect: permissionOverwrites
                    ? getChannelPermissionOverride(
                          PermissionFlagsBits.Connect,
                          permissionOverwrites
                      )
                    : null,
                SendMessages: permissionOverwrites
                    ? getChannelPermissionOverride(
                          PermissionFlagsBits.SendMessages,
                          permissionOverwrites
                      )
                    : null,
                SendMessagesInThreads: permissionOverwrites
                    ? getChannelPermissionOverride(
                          PermissionFlagsBits.SendMessagesInThreads,
                          permissionOverwrites
                      )
                    : null,
                AddReactions: permissionOverwrites
                    ? getChannelPermissionOverride(
                          PermissionFlagsBits.AddReactions,
                          permissionOverwrites
                      )
                    : null
            };

            if (permissionOverwrites)
                await channel.permissionOverwrites?.edit(channel.guild.id, options);
            else await channel.permissionOverwrites?.create(channel.guild.id, options);

            this.client.loggerService
                .logChannelLockOrUnlock({
                    guild: channel.guild,
                    action: "Locked",
                    channel,
                    moderator,
                    reason
                })
                .catch(logError);

            return await this.client.prisma.channelLock.create({
                data: {
                    channel_id: channel.id,
                    guild_id: channel.guild.id,
                    permissions: permissionJson
                }
            });
        } catch (e) {
            logError(e);
            return null;
        }
    }

    async unlock(channel: TextChannel, moderator: User, reason?: string, force?: boolean) {
        try {
            const channelLock = await this.client.prisma.channelLock.findFirst({
                where: {
                    channel_id: channel.id,
                    guild_id: channel.guild.id
                }
            });

            if (!channelLock) return null;

            const options = {
                Connect: force
                    ? true
                    : (channelLock.permissions as unknown as PermissionFlags).Connect,
                SendMessages: force
                    ? true
                    : (channelLock.permissions as unknown as PermissionFlags).SendMessages,
                SendMessagesInThreads: force
                    ? true
                    : (channelLock.permissions as unknown as PermissionFlags).SendMessagesInThreads,
                AddReactions: force
                    ? true
                    : (channelLock.permissions as unknown as PermissionFlags).AddReactions
            };

            const permissionOverwrites = channel.permissionOverwrites?.cache.get(channel.guild.id);

            if (permissionOverwrites)
                await channel.permissionOverwrites?.edit(
                    channel.guild.id,
                    options as PermissionOverwriteOptions
                );
            else
                await channel.permissionOverwrites?.create(
                    channel.guild.id,
                    options as PermissionOverwriteOptions
                );

            this.client.loggerService
                .logChannelLockOrUnlock({
                    guild: channel.guild,
                    action: "Unlocked",
                    channel,
                    moderator,
                    reason
                })
                .catch(logError);

            return true;
        } catch (e) {
            logError(e);
            return false;
        }
    }
}
