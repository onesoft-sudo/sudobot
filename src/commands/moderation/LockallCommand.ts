import { Collection, CommandInteraction, GuildBasedChannel, GuildChannel, Message, Permissions, Role, TextChannel } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import DiscordClient from '../../client/Client';
import MessageEmbed from '../../client/MessageEmbed';

export async function lockAll(client: DiscordClient, role: Role, channels: Collection <string, TextChannel>, send: boolean = true) {
    if (role) {
        // const gen = await channels.first()!.guild.roles.fetch(client.config.props[channels.first()!.guild.id].gen_role);

        await channels.forEach(async channel => {
            try {
                if (send) {
                    await channel.send({
                        embeds: [
                            new MessageEmbed()
                            .setDescription(':lock: This channel has been locked.')
                        ]
                    });
                }

                let dbPerms;

                let overWrites = await channel.permissionOverwrites.cache.get(role.id);
                let allowperms = await overWrites?.allow?.has(Permissions.FLAGS.SEND_MESSAGES);
                let denyperms = await overWrites?.deny?.has(Permissions.FLAGS.SEND_MESSAGES);

                if (allowperms && !denyperms) {
                    await (dbPerms = 'ALLOW');
                }
                else if (!allowperms && denyperms) {
                    await (dbPerms = 'DENY');
                }
                else if (!allowperms && !denyperms) {
                    await (dbPerms = 'NULL');
                }

                console.log(dbPerms);
                

                await client.db.get('INSERT INTO locks(channel_id, perms, date) VALUES(?, ?, ?)', [channel.id, dbPerms, new Date().toISOString()], async (err: any) => {
                    if (err)
                        console.log(err);
                    
                    try {
                        await channel.permissionOverwrites.edit(role, {
                            SEND_MESSAGES: false,
                        });
                    }
                    catch (e) {
                        console.log(e);
                    }
                })
            }
            catch (e) {
                console.log(e);
            }
        });
    }
}

export default class LockallCommand extends BaseCommand {
    supportsInteractions: boolean = true;

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

        const raid = options.isInteraction ? options.options.getBoolean('raid') === true : (options.options.indexOf('--raid') !== -1);

        let role: Role = <Role> msg.guild!.roles.everyone;
        let lockall: string[] = [], lockallChannels: Collection<string, TextChannel> = new Collection();
        // const force = options.isInteraction ? options.options.getBoolean('force') === true : (options.options.indexOf('--force') !== -1);

        if (options.isInteraction) {
            lockall = options.options.getString('channels')!.split(' ');

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
                        lockall.push(a);
                    }
                }
    
                if ((msg as Message).mentions.channels.first()) {
                    (msg as Message).mentions.channels.forEach(c => {
                        if (c instanceof TextChannel)
                            lockallChannels.set(c.id, c);
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
            channels = msg.guild!.channels.cache.filter(c2 => (lockall.includes(c2.id) || lockall.includes(c2.parent?.id!)) && c2.type === 'GUILD_TEXT')!;
            channels = channels.merge(lockallChannels, c => ({ keep: true, value: c }), c => ({ keep: true, value: c }), (c1, c2) => ({ keep: true, value: c2 }));
        }

		await lockAll(client, role, channels as Collection <string, TextChannel>, true);

        if (options.isInteraction) {
            await msg.reply({
                content: "The channels are locked.",
                ephemeral: true
            });
        }
        else {
            await (msg as Message).react('🔒');
        }
    }
}