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

import { Collection, CommandInteraction, Message, Permissions, Role, TextChannel, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import DiscordClient from '../../client/Client';
import MessageEmbed from '../../client/MessageEmbed';

export async function lockAll(client: DiscordClient, role: Role, channels: Collection <string, TextChannel> | TextChannel[], user: User, send: boolean = true, reason?: string) {
    if (role) {
        // const gen = await channels.first()!.guild.roles.fetch(client.config.props[channels.first()!.guild.id].gen_role);

        try {
            return await client.channelLock.lockAll(channels instanceof Collection ? [...channels.values()] : channels, user, {
                role,
                sendConfirmation: send,
                reason
            });
        }
        catch (e) {
            console.log(e);
        }
    }
}

export default class LockallCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    permissions = [Permissions.FLAGS.MANAGE_CHANNELS];

    constructor() {
        super('lockall', 'moderation', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && typeof options.args[0] === 'undefined') {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires at least one argument.`)
                ]
            });

            return;
        }

        if (msg instanceof CommandInteraction) {
            await msg.deferReply({ ephemeral: true });
        }

        const raid = options.isInteraction ? options.options.getBoolean('raid') === true : (options.options.indexOf('--raid') !== -1);

        let role: Role = <Role> msg.guild!.roles.everyone;
        let lockall: string[] = [], lockallChannels: TextChannel[] = [];
        let reason: string | undefined;
        // const force = options.isInteraction ? options.options.getBoolean('force') === true : (options.options.indexOf('--force') !== -1);

        if (options.isInteraction) {
            if (options.options.getString('channels'))
                lockall = options.options.getString('channels')!.split(' ').filter(a => /^\d+$/gi.test(a) || a.startsWith('<#'));

            if (options.options.getRole('role')) {
                role = await <Role> options.options.getRole('role');
            }

            if (options.options.getString('reason')) {
                reason = await <string> options.options.getString('reason');
            }
        }
        else {
            if ((msg as Message).mentions.roles.first()) {
                role = await <Role> (msg as Message).mentions.roles.first();
            }

            if (!role) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription(`Invalid role given.`)
                    ],
                    ephemeral: true
                });
    
                return;
            }

            if (!raid) {
                lockall = options.normalArgs.filter(a => /^\d+$/gi.test(a) || a.startsWith('<#'));
            }
            else {
                if (msg.guild!.channels.cache.size < 2) {
                    await msg.guild?.channels.fetch();
                }

                const raidChannels = client.config.get('raid').channels;

                if (client.config.get('raid').exclude) {
                    lockall = [];

                    for await (const [id, { parent, type }] of msg.guild!.channels.cache) {
                        if (type === 'GUILD_CATEGORY')
                            continue;

                        if ((raidChannels.includes(id) || raidChannels.includes(parent?.id))) {
                            continue;
                        }

                        lockall.push(id);
                    }
                }
                else {
                    // for await (const [id, { parent, type }] of msg.guild!.channels.cache) {
                    //     if (type === 'GUILD_CATEGORY')
                    //         continue;

                    //     if ((!raidChannels.includes(id) && !raidChannels.includes(parent?.id))) {
                    //         continue;
                    //     }

                    //     lockall.push(id);
                    // }

                    lockall = raidChannels;
                }

                console.log("Raid", lockall);
                console.log("Raid 1", client.config.get('raid').channels);
            }
        }

        if (lockall.length === 0 && !raid) {
            await this.deferReply(msg, {
                content: "No channel specified!"
            });

            return;
        }

        if (msg.guild!.channels.cache.size < 2) {
            await msg.guild?.channels.fetch();
        }

        for await (const c of lockall) {
            console.log(c);
            const id = c.startsWith('<#') ? c.substring(2, c.length - 1) : c;

            if (lockallChannels.find(c => c.id === id))
				continue;
			
            const channel = msg.guild?.channels.cache.get(id);

            if (!channel) {
                continue;
            }
                
			if (!channel.isText()) {
			    lockallChannels = [...lockallChannels, ...(msg.guild?.channels.cache.filter(c => c.parent?.id === id) as Collection<string, TextChannel>).values()!];
                continue;
            }

            lockallChannels.push(channel as TextChannel);
        }

        console.log("Array: ", lockallChannels, lockall);

		const [success, failure] = (await lockAll(client, role, lockallChannels, msg.member!.user as User, true, reason))!;

        if (options.isInteraction) {
            await this.deferReply(msg, {
                content: "Locked " + lockallChannels.length + " channel(s)." + (failure > 0 ? ` ${success} successful locks and ${failure} failed locks.` : '')
            });
        }
        else {
            await (msg as Message).react('🔒');
        }
    }
}