import { GuildChannel, PermissionString, User } from "discord.js";
import MessageEmbed from "../client/MessageEmbed";
import ChannelLock from "../models/ChannelLock";
import Service from "../utils/structures/Service";

export interface ChannelLockOptions {
    reason?: string;
    sendConfirmation?: boolean;
    force?: boolean;
}

export default class ChannelLockManager extends Service {
    async lock(channel: GuildChannel, user: User, { reason, sendConfirmation }: ChannelLockOptions = {}) {
        const channelLock = await ChannelLock.findOne({
            where: {
                channel_id: channel.id,
                guild_id: channel.guild.id
            }
        });

        if (channelLock) {
            return false;
        }

        const permissions = channel.permissionOverwrites.cache.get(channel.guild.id);
        
        if (permissions) {
            const permJson = {
                allow: permissions.allow.toArray(),
                deny: permissions.deny.toArray(),
            };

            console.log(permJson);

            await ChannelLock.create({
                user_id: user.id,
                guild_id: channel.guild.id,
                channel_id: channel.id,
                reason,
                previous_perms: permJson
            });
        }

        await channel.permissionOverwrites.edit(channel.guild.id, {
            SEND_MESSAGES: false,
            SEND_MESSAGES_IN_THREADS: false,
            ADD_REACTIONS: false,
            REQUEST_TO_SPEAK: false,
            SPEAK: false,
        }, { reason });

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

    async unlock(channel: GuildChannel, { reason, sendConfirmation, force }: ChannelLockOptions = {}) {
        const channelLock = await ChannelLock.findOne({
            where: {
                channel_id: channel.id,
                guild_id: channel.guild.id
            }
        });

        const permissions = channelLock?.get('previous_perms') as { allow: PermissionString[], deny: PermissionString[] };

        if (!permissions && !force) {
            return false;
        }

        const transform = (key: PermissionString) => {
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

        await channel.permissionOverwrites.edit(channel.guild.id, {
            SEND_MESSAGES: transform('SEND_MESSAGES'),
            SEND_MESSAGES_IN_THREADS: transform('SEND_MESSAGES_IN_THREADS'),
            ADD_REACTIONS: transform('ADD_REACTIONS'),
            REQUEST_TO_SPEAK: transform('REQUEST_TO_SPEAK'),
            SPEAK: transform('SPEAK'),
        }, { reason });

        await channelLock?.destroy();

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

    lockAll(channels: GuildChannel[], user: User, options: ChannelLockOptions = {}) {
        return Promise.all(channels.map(c => this.lock(c, user, options)));
    }

    unlockAll(channels: GuildChannel[], options: ChannelLockOptions = {}) {
        return Promise.all(channels.map(c => this.unlock(c, options)));
    }
}