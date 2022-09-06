import { BanOptions, CommandInteraction, Message, User, Permissions } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import { fetchEmoji } from '../../utils/Emoji';
import Punishment from '../../models/Punishment';
import PunishmentType from '../../types/PunishmentType';
import { hasPermission, shouldNotModerate } from '../../utils/util';

export default class MassBanCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    
    permissions = [Permissions.FLAGS.BAN_MEMBERS];

    constructor() {
        super('massban', 'moderation', []);
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

        if (msg instanceof CommandInteraction)
            await msg.deferReply();

        let arr: (string | User)[] = [];
        let reasonStart = false;
        let banOptions: BanOptions = {};

        if (options.isInteraction) {
            arr = (<string> options.options.getString('users')).split(' ');

            if (options.options.getString('reason'))
                banOptions.reason = <string> options.options.getString('reason');

            if (options.options.getInteger('days'))
                banOptions.days = <number> options.options.getInteger('days');
        }
        else {
            let i = 0;

            for await (const arg of options.args) {
                if (!/^\d+$/g.test(arg) && !(arg.startsWith('<@') && arg.endsWith('>'))) {
                    reasonStart = true;
                }

                if (reasonStart) {
                    banOptions.reason = banOptions.reason ?? '';
                    banOptions.reason += arg + ' ';
                }
                else {
                    if (/^\d+$/g.test(arg)) {
                        arr.push(arg);
                    }
                    else if ((msg as Message).mentions.users.at(i)) {
                        arr.push((msg as Message).mentions.users.at(i)! as User);
                        console.log((msg as Message).mentions.users.at(i)!);
                        
                        i++;
                    }
                }
            }

            if (banOptions.reason) {
                banOptions.reason = banOptions.reason.trim();
            }
        }

        if (arr.length < 1) {
            await this.deferReply(msg, {
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`Invalid user(s) given.`)
                ]
            });

            return;
        }

        let usersStr = '';

        for await (const uid of arr) {
            try {
                console.log(uid);
                
                const user = typeof uid === 'string' ? await client.users.fetch(uid) : uid;

                try {
                    console.log(banOptions.reason);

                    try {
                    	const member = await msg.guild?.members.fetch(user.id);

						if (member && !(await hasPermission(client, member, msg, null, "You don't have permission to ban " + user.tag + ".")))
							break;
							
                    	if (member && shouldNotModerate(client, member)) {
                    		await msg.reply({
                    			embeds: [
                    				new MessageEmbed()
                    				.setColor('#f14a60')
                    				.setDescription('The user ' + user.tag + ' is not bannable.')
                    			]
                    		});

                    		return;
                    	}
                    }
                    catch (e) {
                    	console.log(e);
                    }

                    await Punishment.create({
                        type: PunishmentType.BAN,
                        user_id: user.id,
                        guild_id: msg.guild!.id,
                        mod_id: msg.member!.user.id,
                        mod_tag: (msg.member!.user as User).tag,
                        reason: banOptions.reason ?? undefined,
                        createdAt: new Date()
                    });

                    await msg.guild!.bans.create(user, banOptions);
                    
                    usersStr += user.tag + ' (' + user.id + ')\n';
                }
                catch (e) {
                    console.log(e);
                
                    await this.deferReply(msg, {
                        content: 'Failed to ban ' + user.tag + ' (' + user.id + ').'
                    });

                    return;
                }
            }
            catch (e) {
                console.log(e);
                
                await this.deferReply(msg, {
                    content: 'Invalid ID(s) given. (' + uid.toString() + ')'
                });

                return;
            }
        }

        await this.deferReply(msg, {
            embeds: [
                new MessageEmbed()
                .setAuthor({
                    name: 'Mass Ban'
                })
                .setDescription(`${(await fetchEmoji('check'))?.toString()} Mass banned the following users:\n\n${usersStr}`)
                .addField('Reason', banOptions.reason ?? '*No reason provided*')
            ]
        });
    }
}
