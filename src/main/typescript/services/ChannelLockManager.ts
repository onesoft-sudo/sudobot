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

import APIErrors from "@framework/errors/APIErrors";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { isDiscordAPIError } from "@framework/utils/errors";
import { channelLocks } from "@main/models/ChannelLock";
import { Guild, GuildBasedChannel, PermissionsString, Snowflake, ThreadChannel } from "discord.js";
import { and, eq, inArray } from "drizzle-orm";

@Name("channelLockManager")
class ChannelLockManager extends Service {
    private filter(this: void, permission: string) {
        return [
            "SendMessages",
            "SendTTSMessages",
            "SendVoiceMessages",
            "SendMessagesInThreads",
            "AddReactions",
            "Speak",
            "Connect",
            "UseApplicationCommands",
            "CreatePublicThreads",
            "CreatePrivateThreads
        ].includes(permission);
    }

    public async lock(channel: Exclude<GuildBasedChannel, ThreadChannel>) {
        if (!channel.manageable) {
            return {
                status: "error" as const,
                type: "not_managable" as const,
                message: "The system cannot manage this channel"
            };
        }

        const channelLock = await this.application.database.query.channelLocks.findFirst({
            where: and(
                eq(channelLocks.channelId, channel.id),
                eq(channelLocks.guildId, channel.guild.id)
            )
        });

        if (channelLock) {
            return {
                status: "error" as const,
                type: "channel_already_locked" as const,
                message: "This channel is already locked"
            };
        }

        const overwrite = channel.permissionOverwrites.cache.get(channel.guild.roles.everyone.id);

        await this.application.database.drizzle.insert(channelLocks).values({
            permissions: {
                allow: overwrite?.allow.toArray().filter(this.filter) ?? [],
                deny: overwrite?.deny.toArray().filter(this.filter) ?? []
            },
            channelId: channel.id,
            guildId: channel.guild.id
        });

        try {
            await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
                SendMessages: false,
                SendTTSMessages: false,
                SendVoiceMessages: false,
                SendMessagesInThreads: false,
                AddReactions: false,
                Speak: false,
                Connect: false,
                UseApplicationCommands: false,
                CreatePublicThreads: false,
                CreatePrivateThreads: false,
            });
        } catch (error) {
            this.application.logger.error(error);

            if (isDiscordAPIError(error)) {
                return {
                    status: "error" as const,
                    type: "api_error" as const,
                    code: error.code,
                    message: APIErrors.translateToMessage(+error.code)
                };
            }

            return {
                status: "error" as const,
                type: "unknown" as const,
                message: "An unknown error has occurred"
            };
        }

        return { status: "success" as const };
    }

    private overwritePermissions(overwrite: unknown, permission: PermissionsString) {
        if (!overwrite) {
            return false;
        }

        const castedOverwrite = overwrite as {
            allow: Readonly<Array<PermissionsString>>;
            deny: Readonly<Array<PermissionsString>>;
        };

        if (castedOverwrite.allow.includes(permission)) {
            return true;
        }

        if (castedOverwrite.deny.includes(permission)) {
            return false;
        }

        return null;
    }

    public async unlock(channel: Exclude<GuildBasedChannel, ThreadChannel>) {
        if (!channel.manageable) {
            return {
                status: "error" as const,
                type: "not_managable" as const,
                message: "The system cannot manage this channel"
            };
        }

        const channelLock = await this.application.database.drizzle.query.channelLocks.findFirst({
            where: and(
                eq(channelLocks.channelId, channel.id),
                eq(channelLocks.guildId, channel.guild.id)
            )
        });

        if (!channelLock) {
            return {
                status: "error" as const,
                type: "channel_not_locked" as const,
                message: "This channel is not locked"
            };
        }

        await this.application.database.drizzle
            .delete(channelLocks)
            .where(eq(channelLocks.id, channelLock.id));

        try {
            await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
                SendMessages: this.overwritePermissions(channelLock.permissions, "SendMessages"),
                SendTTSMessages: this.overwritePermissions(
                    channelLock.permissions,
                    "SendTTSMessages"
                ),
                SendVoiceMessages: this.overwritePermissions(
                    channelLock.permissions,
                    "SendVoiceMessages"
                ),
                SendMessagesInThreads: this.overwritePermissions(
                    channelLock.permissions,
                    "SendMessagesInThreads"
                ),
                AddReactions: this.overwritePermissions(channelLock.permissions, "AddReactions"),
                Speak: this.overwritePermissions(channelLock.permissions, "Speak"),
                Connect: this.overwritePermissions(channelLock.permissions, "Connect"),
                UseApplicationCommands: this.overwritePermissions(
                    channelLock.permissions,
                    "UseApplicationCommands"
                ),
                CreatePublicThreads: this.overwritePermissions(
                    channelLock.permissions,
                    "CreatePublicThreads"
                ),
                CreatePrivateThreads: this.overwritePermissions(
                    channelLock.permissions,
                    "CreatePrivateThreads"
                ),
            });
        } catch (error) {
            this.application.logger.error(error);

            if (isDiscordAPIError(error)) {
                return {
                    status: "error" as const,
                    type: "api_error" as const,
                    code: error.code,
                    message: APIErrors.translateToMessage(+error.code)
                };
            }

            return {
                status: "error" as const,
                type: "unknown" as const,
                message: "An unknown error has occurred"
            };
        }

        return { status: "success" as const };
    }

    public async lockAll(guild: Guild, channels?: Iterable<GuildBasedChannel>) {
        const lockRecords = [] as Array<{
            guildId: Snowflake;
            channelId: Snowflake;
            permissions: {
                allow: Array<PermissionsString>;
                deny: Array<PermissionsString>;
            };
        }>;
        let permissionErrors = 0,
            alreadyLocked = 0,
            success = 0,
            skipped = 0;
        const errors: string[] = [];

        const lockedChannels = await this.application.database.drizzle.query.channelLocks.findMany({
            where: eq(channelLocks.guildId, guild.id)
        });

        for (const channel of channels ?? guild.channels.cache.values()) {
            if (channel.isThread()) {
                continue;
            }

            if (lockedChannels.find(lock => lock.channelId === channel.id)) {
                alreadyLocked++;
                continue;
            }

            if (!channel.manageable) {
                permissionErrors++;
                continue;
            }

            const overwrite = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);

            if (overwrite?.deny.has("ViewChannel")) {
                skipped++;
                continue;
            }

            try {
                await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
                    SendMessages: false,
                    SendTTSMessages: false,
                    SendVoiceMessages: false,
                    SendMessagesInThreads: false,
                    AddReactions: false,
                    Speak: false,
                    Connect: false,
                    UseApplicationCommands: false,
                    CreatePublicThreads: false,
                    CreatePrivateThreads: false,
                });
            } catch (error) {
                this.application.logger.error(error);

                if (isDiscordAPIError(error)) {
                    errors.push(`<@${channel.id}>: ${APIErrors.translateToMessage(+error.code)}`);
                    permissionErrors++;
                    continue;
                }

                errors.push(`<@${channel.id}>: An unknown error has occurred`);
                continue;
            }

            lockRecords.push({
                permissions: {
                    allow: overwrite?.allow.toArray().filter(this.filter) ?? [],
                    deny: overwrite?.deny.toArray().filter(this.filter) ?? []
                },
                channelId: channel.id,
                guildId: channel.guild.id
            });

            success++;
        }

        await this.application.database.drizzle.insert(channelLocks).values(lockRecords);

        return {
            permissionErrors,
            alreadyLocked,
            success,
            errors,
            skipped,
            total: guild.channels.cache.filter(channel => !channel.isThread()).size
        };
    }

    public async unlockAll(guild: Guild, channels?: Iterable<GuildBasedChannel>) {
        const lockRecords = [] as Array<number>;
        let permissionErrors = 0,
            notLocked = 0,
            success = 0,
            skipped = 0;
        const errors: string[] = [];

        const lockedChannels = await this.application.database.query.channelLocks.findMany({
            where: eq(channelLocks.guildId, guild.id)
        });

        for (const channel of channels ?? guild.channels.cache.values()) {
            if (channel.isThread()) {
                continue;
            }

            const channelLock = lockedChannels.find(lock => lock.channelId === channel.id);

            if (!channelLock) {
                notLocked++;
                continue;
            }

            if (!channel.manageable) {
                permissionErrors++;
                continue;
            }

            if (
                channel.permissionOverwrites.cache
                    .get(channel.guild.roles.everyone.id)
                    ?.deny.has("ViewChannel")
            ) {
                skipped++;
                continue;
            }

            try {
                await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
                    SendMessages: this.overwritePermissions(
                        channelLock.permissions,
                        "SendMessages"
                    ),
                    SendTTSMessages: this.overwritePermissions(
                        channelLock.permissions,
                        "SendTTSMessages"
                    ),
                    SendVoiceMessages: this.overwritePermissions(
                        channelLock.permissions,
                        "SendVoiceMessages"
                    ),
                    SendMessagesInThreads: this.overwritePermissions(
                        channelLock.permissions,
                        "SendMessagesInThreads"
                    ),
                    AddReactions: this.overwritePermissions(
                        channelLock.permissions,
                        "AddReactions"
                    ),
                    Speak: this.overwritePermissions(channelLock.permissions, "Speak"),
                    Connect: this.overwritePermissions(channelLock.permissions, "Connect"),
                    UseApplicationCommands: this.overwritePermissions(
                        channelLock.permissions,
                        "UseApplicationCommands"
                    ),
                    CreatePublicThreads: this.overwritePermissions(
                        channelLock.permissions,
                        "CreatePublicThreads"
                    ),
                    CreatePrivateThreads: this.overwritePermissions(
                        channelLock.permissions,
                        "CreatePrivateThreads"
                    ),
                });
            } catch (error) {
                this.application.logger.error(error);

                if (isDiscordAPIError(error)) {
                    errors.push(`<@${channel.id}>: ${APIErrors.translateToMessage(+error.code)}`);
                    permissionErrors++;
                    continue;
                }

                errors.push(`<@${channel.id}>: An unknown error has occurred`);
                continue;
            }

            lockRecords.push(channelLock.id);
            success++;
        }

        await this.application.database.drizzle
            .delete(channelLocks)
            .where(inArray(channelLocks.id, lockRecords));

        return {
            permissionErrors,
            notLocked,
            success,
            errors,
            skipped,
            total: guild.channels.cache.filter(channel => !channel.isThread()).size
        };
    }
}

export default ChannelLockManager;
