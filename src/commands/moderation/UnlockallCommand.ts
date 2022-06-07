import { Collection, CommandInteraction, GuildBasedChannel, GuildChannel, Message, Permissions, Role, TextChannel } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import DiscordClient from '../../client/Client';
import MessageEmbed from '../../client/MessageEmbed';

export async function unlockAll(client: DiscordClient, role: Role, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions, channels: Collection <string, TextChannel>, force: boolean) {
	if (role) {
		channels.forEach(async channel => {
			try {
				client.db.get('SELECT * FROM locks WHERE channel_id = ?', [channel.id], async (err: any, data: any) => {
					if (data || force) {
						await channel.send({
							embeds: [
								new MessageEmbed()
								.setDescription(':closed_lock_with_key: This channel has been unlocked.')
							]
						});
						
						let perm;
						const data1 = data?.perms;

						if (data1) {
							if (data1 === 'DENY') {
								await (perm = false);
							}
							else if (data1 === 'NULL') {
								await (perm = null);
							}
							else if (data1 === 'ALLOW') {
								await (perm = true);
							}
						}
						
						if (force) {
							await (perm = true);
						}

						await console.log(channel.name);

						try {
							await channel.permissionOverwrites.edit(role, {
								SEND_MESSAGES: perm,
							});

						}
						catch (e) {
							console.log(e);
						}

						await console.log(perm);

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

		const raid = options.isInteraction ? options.options.getBoolean('raid') === true : (options.options.indexOf('--raid') !== -1);

		let role: Role = <Role> msg.guild!.roles.everyone;
		let unlockall: string[] = [], unlockallChannels: Collection<string, TextChannel> = new Collection();
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
            else if (options.options.includes('-r') && options.normalArgs[options.options.indexOf('-r') + 1]) {
                role = <Role> await (msg as Message).guild?.roles.fetch(options.normalArgs[options.options.indexOf('-r') + 1]);
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
                for (const a of options.args) {
                    if (/^\d+$/g.test(a)) {
                        unlockall.push(a);
                    }
                }
    
                if ((msg as Message).mentions.channels.first()) {
                    (msg as Message).mentions.channels.forEach(c => {
                        if (c instanceof TextChannel)
                            unlockallChannels.set(c.id, c);
                    });
                }
            }
		}

		let channels = raid ? await msg.guild!.channels.cache.filter(c => (
            (raid && (
				(client.config.props[msg.guild!.id].raid.exclude && (client.config.props[msg.guild!.id].raid.channels.indexOf(c.id) === -1 && client.config.props[msg.guild!.id].raid.channels.indexOf(c.parent?.id) === -1)) || 
				(!client.config.props[msg.guild!.id].raid.exclude && (client.config.props[msg.guild!.id].raid.channels.indexOf(c.id) !== -1 || client.config.props[msg.guild!.id].raid.channels.indexOf(c.parent?.id) !== -1))
			))) && c.type === 'GUILD_TEXT'
        ) : null;

        if (channels === null && !raid) {
            channels = msg.guild!.channels.cache.filter(c2 => (unlockall.includes(c2.id) || unlockall.includes(c2.parent?.id!)) && c2.type === 'GUILD_TEXT')!;
			channels = channels.merge(unlockallChannels, c => ({ keep: true, value: c }), c => ({ keep: true, value: c }), (c1, c2) => ({ keep: true, value: c2 }));
        }

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