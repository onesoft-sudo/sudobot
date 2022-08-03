import { BanOptions, CommandInteraction, Emoji, GuildChannel, GuildMember, Interaction, Message, TextChannel, User, Permissions } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getUser from '../../utils/getUser';
import getMember from '../../utils/getMember';
import History from '../../automod/History';
import { fetchEmoji } from '../../utils/Emoji';
import { hasPermission, shouldNotModerate } from '../../utils/util';

export default class ClearCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    permissions = [Permissions.FLAGS.MANAGE_MESSAGES];

    constructor() {
        super('clear', 'moderation', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && options.args[0] === undefined) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription('This command requires at least one argument.')
                ]
            });

            return;
        }

        let user: User | undefined | null;
        let msgCount = 0, channel: GuildChannel = msg.channel! as GuildChannel;

        if (options.isInteraction) {
            if (options.options.getUser('user'))
                user = <User> options.options.getUser('user');

            console.log(user?.tag);            

            if (options.options.getChannel('channel')) {
                channel = <GuildChannel> options.options.getChannel('channel');

                if (channel.type !== 'GUILD_TEXT' && channel.type !== 'GUILD_NEWS' && channel.type !== 'GUILD_PUBLIC_THREAD' && channel.type !== 'GUILD_PRIVATE_THREAD') {
                    await msg.reply({
                        content: 'Invalid channel given.'
                    });
                    
                    return;
                }
            }

            if (options.options.getInteger('count')) {
                msgCount = <number> options.options.getInteger('count');
            }
        }
        else {
            try {
                user = await getUser(client, msg as Message, options);

                if (!user) {
                    throw new Error();
                }
            }
            catch (e) {
                console.log(e);
                
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription('Invalid user given.')
                    ]
                });
    
                return;
            }
        }
        
        if (msgCount === 0 && !user) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription('You have to specify either the message count or the user.')
                ]
            });

            return;
        }

        if (user) {
        	try {
        		const member = await msg.guild?.members.fetch(user.id);

				if (member && !(await hasPermission(client, member, msg, null, "You don't have permission to clear messages from this user.")))
					return;

        		if (member && shouldNotModerate(client, member)) {
        			await msg.reply({
      					embeds: [
        					{ description: "Cannot clear messages from this user: Operation not permitted" }
        				]
        			});
        			
        			return;
        		}
        	}
        	catch (e) {
        		console.log(e);
        	}
        }

        let count = 0;
        (global as any).deletingMessages = true;

        let message = await msg.reply({
            embeds: [
                new MessageEmbed()
                .setColor('GOLD')
                .setDescription((await fetchEmoji('loading'))?.toString() + ' Deleting messages...')
            ]
        });

        if (msg instanceof CommandInteraction)
            message = <Message> await msg.fetchReply();

        if (msgCount === 0 && user) {
            console.log(user?.tag);
            
            let fetched;

            do {
                fetched = await (channel as TextChannel).messages.fetch({ limit: 100 });
                fetched = await fetched.filter(m => m.author.id === user!.id && m.id !== message!.id && (Date.now() - m.createdTimestamp) <= (2 * 7 * 24 * 60 * 60 * 1000));
                await (channel as TextChannel).bulkDelete(fetched);
                count += fetched.size;

                /*for await (const [id, m] of fetched.entries()) {
                	try {
                		await m.delete();
                		count++;
                	}
                	catch (e) {
                		console.log('Error deleting message', e);
                	}
                }
                */
                
                await new Promise(r => setTimeout(r, 900));
            }
            while (fetched.size >= 2);
        }
        else {
            let fetched = 0;
            let safeLimit = 0, safeLimit2 = 0;

            do {
                if (count >= msgCount || safeLimit >= 50) {
                    break;
                }

                try {
                    const data = await (channel as TextChannel).messages.fetch({ limit: 100 });

                    fetched = 0;

                    for await (const [id, m] of data.entries()) {
                        try {
                            if (count >= msgCount || safeLimit2 > 200) {
                                break;
                            }

                            if (user && m.author?.id !== user?.id) {
                                continue;
                            }

                            if (message!.id === m.id || (Date.now() - m.createdTimestamp) > (2 * 7 * 24 * 60 * 60 * 1000))
                                continue;

                            if (m.deletable) {
                                console.log('here', user?.tag);
                                
                                await m.delete();

                                fetched++;
                                count++;
                                safeLimit2++;
                            }

                            if (count % 10 === 0) {
                                await new Promise(r => setTimeout(r, 1100));
                            }
                        }
                        catch(e) {
                            console.log(e);
                            safeLimit2 += 100;
                        }
                    }
                }
                catch(e) {
                    console.log(e);
                    
                    break;
                }

                safeLimit++;
            }
            while (fetched >= 2);
        }

        const messageOptions = {
            embeds: [
                new MessageEmbed()
                .setColor('GREEN')
                .setDescription((await fetchEmoji('check') as Emoji).toString() + " Deleted " + count + " message(s)" + (user ? " from user " + user.tag : ''))
            ]
        };

        if (msg instanceof CommandInteraction) {
            await msg.editReply(messageOptions);
        }
        else {
            await message!.edit(messageOptions);
        }

        setTimeout(async () => {
            try {
                if (msg instanceof Message)
                    await msg.delete();
            }
            catch (e) {
                console.log(e);                
            }
            
            try {
                await message!.delete();
            }
            catch (e) {
                console.log(e);                
            }
        }, 5500);

        (global as any).deletingMessages = false;
    }
}
