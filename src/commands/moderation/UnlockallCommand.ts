
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

import { Collection, CommandInteraction, Message, Role, TextChannel } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import DiscordClient from '../../client/Client';
import MessageEmbed from '../../client/MessageEmbed';

export async function unlockAll(client: DiscordClient, role: Role, channels: TextChannel[], force: boolean, reason?: string) {
	try {
		return await client.channelLock.unlockAll(channels, {
			force,
			role,
			reason,
			sendConfirmation: true
		});
	}
	catch (e) {
		console.log(e);			
	}
}

export default class UnlockallCommand extends BaseCommand {
	supportsInteractions: boolean = true;

	constructor() {
		super('unlockall', 'moderation', []);
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
		let unlockall: string[] = [], unlockallChannels: TextChannel[] = [];
		const force = options.isInteraction ? options.options.getBoolean('force') === true : (options.options.indexOf('--force') !== -1);
		let reason: string | undefined;

		if (options.isInteraction) {
			if (options.options.getString('channels'))
            	unlockall = options.options.getString('channels')!.split(' ').filter(a => /^\d+$/gi.test(a) || a.startsWith('<#'));

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
                unlockall = options.normalArgs.filter(a => /^\d+$/gi.test(a) || a.startsWith('<#'));
				console.log("Unlock", unlockall);
            }
            else {
                if (msg.guild!.channels.cache.size < 2) {
                    await msg.guild?.channels.fetch();
                }

                unlockall = client.config.get('raid').exclude ? msg.guild?.channels.cache.filter(c => !client.config.get('raid').channels.includes(c.id) && !client.config.get('raid').channels.includes(c.parent?.id)) : client.config.get('raid').channels;
            }
		}

		if (msg.guild!.channels.cache.size < 2) {
            await msg.guild?.channels.fetch();
        }

		if (unlockall.length === 0 && !raid) {
            await this.deferReply(msg, {
                content: "No channel specified!"
            });

            return;
        }

        for await (const c of unlockall) {
            console.log(c);
            const id = c.startsWith('<#') ? c.substring(2, c.length - 1) : c;
			
			if (unlockallChannels.find(c => c.id === id))
				continue;
			
            const channel = msg.guild?.channels.cache.get(id);

			if (!channel) {
                continue;
            }
                
			if (!channel.isText()) {
			    unlockallChannels = [...unlockallChannels, ...(msg.guild?.channels.cache.filter(c => c.parent?.id === id) as Collection<string, TextChannel>).values()!];
                continue;
            }

            unlockallChannels.push(channel as TextChannel);
        }

		const [success, failure] = (await unlockAll(client, role, unlockallChannels, force, reason))!;

		if (options.isInteraction) {
			await this.deferReply(msg, {
                content: "Unlocked " + unlockallChannels.length + " channel(s)." + (failure > 0 ? ` ${success} successful unlocks and ${failure} failed unlocks.` : '')
            });
		}
		else {
			await (msg as Message).react('🔓');
		}
	}
}