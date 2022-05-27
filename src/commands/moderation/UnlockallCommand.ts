import { Collection, CommandInteraction, GuildBasedChannel, GuildChannel, Message, Permissions, Role, TextChannel } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import DiscordClient from '../../client/Client';
import MessageEmbed from '../../client/MessageEmbed';

export async function unlockAll(client: DiscordClient, role: Role, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions, channels: Collection <string, TextChannel>, force: boolean) {
	if (role) {
		const gen = await msg.guild!.roles.fetch(client.config.props[msg.guild!.id].gen_role);

		channels.forEach(async channel => {
			try {
				await channel.send({
					embeds: [
						new MessageEmbed()
						.setDescription(':closed_lock_with_key: This channel has been unlocked.')
					]
				});

				client.db.get('SELECT * FROM locks WHERE channel_id = ?', [channel.id], async (err: any, data: any) => {
					if (data || force) {
						let perm1;
						let perm;
						const data1 = data?.perms?.split(',');

						if (data1) {
							if (data1[0] === 'DENY') {
								await (perm = false);
							}
							else if (data1[0] === 'NULL') {
								await (perm = null);
							}
							else if (data1[0] === 'ALLOW') {
								await (perm = true);
							}

							if (data1[1] === 'DENY') {
								await (perm1 = false);
							}
							else if (data1[1] === 'NULL') {
								await (perm1 = null);
							}
							else if (data1[1] === 'ALLOW') {
								await (perm1 = true);
							}
						}
						
						if (force) {
							await (perm1 = true);
							await (perm = true);
						}

						await console.log(channel.name);

						try {
							await channel.permissionOverwrites.edit(role, {
								SEND_MESSAGES: perm,
							});

							await channel.permissionOverwrites.edit(gen!, {
								SEND_MESSAGES: perm1,
							});
						}
						catch (e) {
							console.log(e);
						}

						await console.log(perm, perm1);

						if (data) {
							await client.db.get('DELETE FROM locks WHERE id = ?', [data?.id], async (err: any) => {});
						}
					}
				});
			}
			catch(e) {
				console.log(e);
			}
		});
	}
}

export default class UnlockallCommand extends BaseCommand {
	supportsInteractions: boolean = true;

	constructor() {
		super('unlockall', 'moderation', []);
	}

	async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
		const raid = options.isInteraction ? options.options.getBoolean('raid') === true : (options.options.indexOf('--raid') !== -1);

		let role: Role = <Role> msg.guild!.roles.everyone;
		const force = options.isInteraction ? options.options.getBoolean('force') === true : (options.options.indexOf('--force') !== -1);

		if (options.isInteraction) {
			if (options.options.getChannel('role')) {
				role = await <Role> options.options.getRole('role');
			}
		}
		else {
			if ((msg as Message).mentions.roles.first()) {
				role = await <Role> (msg as Message).mentions.roles.first();
			}
			else if (options.normalArgs[0] && options.normalArgs[0] !== 'everyone') {
				role = <Role> await (msg as Message).guild?.roles.fetch(options.normalArgs[0]);
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
		}

		const channels: Collection <string, GuildBasedChannel> = await msg.guild!.channels.cache.filter(c => (
            (!raid && (client.config.props[msg.guild!.id].lockall.indexOf(c.id) !== -1 || client.config.props[msg.guild!.id].lockall.indexOf(c.parent?.id) !== -1)) ||
            (raid && (
				(client.config.props[msg.guild!.id].raid.exclude && (client.config.props[msg.guild!.id].raid.channels.indexOf(c.id) === -1 && client.config.props[msg.guild!.id].raid.channels.indexOf(c.parent?.id) === -1)) || 
				(!client.config.props[msg.guild!.id].raid.exclude && (client.config.props[msg.guild!.id].raid.channels.indexOf(c.id) !== -1 || client.config.props[msg.guild!.id].raid.channels.indexOf(c.parent?.id) !== -1))
			))) && c.type === 'GUILD_TEXT'
        );

		await unlockAll(client, role, msg, options, channels as Collection <string, TextChannel>, force);

		if (options.isInteraction) {
			await msg.reply({
				content: "The channels are unlocked.",
				ephemeral: true
			});
		}
		else {
			await (msg as Message).react('🔓');
		}
	}
}