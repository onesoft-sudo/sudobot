/**
* This file is part of SudoBot.
* 
* Copyright (C) 2021-2022 OSN Inc.
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

import { GuildChannel, PermissionString, Role, RoleResolvable, User } from "discord.js";
import MessageEmbed from "../client/MessageEmbed";
import ChannelLock from "../models/ChannelLock";
import Service from "../utils/structures/Service";

export interface ChannelLockOptions {
    reason?: string;
    sendConfirmation?: boolean;
    force?: boolean;
    role?: RoleResolvable;
}

export default class ChannelLockManager extends Service {
    async lock(channel: GuildChannel, user: User, { reason, sendConfirmation, role }: ChannelLockOptions = {}) {
        const lockRole = role ? (role instanceof Role ? role : (await channel.guild.roles.fetch(role))!) : channel.guild.roles.everyone;

        const channelLock = await ChannelLock.findOne({
            where: {
                channel_id: channel.id,
                guild_id: channel.guild.id,
                role_id: lockRole.id
            }
        });

        if (channelLock) {
            console.log('exists');
            return false;
        }

        console.log(lockRole?.name);

        let permissions = channel.permissionOverwrites.cache.get(lockRole.id);

        const permJson = {
            allow: permissions?.allow?.toArray() ?? null,
            deny: permissions?.deny?.toArray() ?? null,
        };

        console.log(permJson);

        await ChannelLock.create({
            user_id: user.id,
            guild_id: channel.guild.id,
            channel_id: channel.id,
            reason,
            previous_perms: permJson,
            role_id: lockRole.id,
            createdAt: new Date()
        });

        await channel.permissionOverwrites.edit(lockRole, {
            SEND_MESSAGES: false,
            SEND_MESSAGES_IN_THREADS: false,
            REQUEST_TO_SPEAK: false,
            SPEAK: false,
        }, { reason });

        console.log('success');

        if (sendConfirmation && channel.isText()) {
            await channel.send({
                embeds: [
                    new MessageEmbed({
                        color: 0x007bff,
                        description: `:lock: This channel has been locked.`,
                        fields: reason ? [
                            {
                                name: 'Reason',
                                value: reason + ''
                            }
                        ] : [],
                        footer: { text: 'Locked' }
                    })
                    .setTimestamp()
                ]
            });
        }

        return true;
    }

    async unlock(channel: GuildChannel, { reason, sendConfirmation, force, role }: ChannelLockOptions = {}) {
        const lockRole = role ? (role instanceof Role ? role : (await channel.guild.roles.fetch(role))!) : channel.guild.roles.everyone;

        const channelLock = await ChannelLock.findOne({
            channel_id: channel.id,
            guild_id: channel.guild.id,
            role_id: lockRole.id
        });

        if (!channelLock) {
            console.log('Channel not locked');            
            return false;
        }

        const permissions = channelLock?.previous_perms; //  as { allow: PermissionString[] | null, deny: PermissionString[] | null }

        if (!permissions && !force) {
            console.log('Permission error');
            return false;
        }

        const transform = (key: PermissionString) => {
            if (!permissions?.allow || !permissions?.deny) {
                return undefined;
            }

            if (!permissions) {
                return force ? true : undefined;
            }

            if (permissions.allow.includes(key) && !permissions.deny.includes(key)) {
                return true;
            }
            else if (!permissions.allow.includes(key) && permissions.deny.includes(key)) {
                return false;
            }
            else {
                return null;
            }
        };

        if (!permissions?.allow && !permissions?.deny) {
            await channel.permissionOverwrites.delete(lockRole);
        }
        else {
            await channel.permissionOverwrites.edit(lockRole, {
                SEND_MESSAGES: transform('SEND_MESSAGES'),
                SEND_MESSAGES_IN_THREADS: transform('SEND_MESSAGES_IN_THREADS'),
                REQUEST_TO_SPEAK: transform('REQUEST_TO_SPEAK'),
                SPEAK: transform('SPEAK'),
            }, { reason });
        }        

        await channelLock?.delete();

        if (sendConfirmation && channel.isText()) {
            await channel.send({
                embeds: [
                    new MessageEmbed({
                        color: 0x007bff,
                        description: `:closed_lock_with_key: This channel has been unlocked.`,
                        fields: reason ? [
                            {
                                name: 'Reason',
                                value: reason + ''
                            }
                        ] : [],
                        footer: { text: 'Unlocked' }
                    })
                    .setTimestamp()
                ]
            });
        }

        return true;
    }

    async lockAll(channels: GuildChannel[], user: User, options: ChannelLockOptions = {}) {
        let success = 0, failure = 0;

        for await (const channel of channels) {
            console.log('Locking', channel.name);
            
            if (await this.lock(channel, user, options)) {
                success++;
            }
            else {
                failure++;
            }
        }

        return [success, failure];
    }

    async unlockAll(channels: GuildChannel[], options: ChannelLockOptions = {}) {
        let success = 0, failure = 0;

        for await (const channel of channels) {
            console.log('Unlocking', channel.name);

            if (await this.unlock(channel, options)) {
                success++;
            }
            else {
                failure++;
            }
        }

        return [success, failure];
    }
}