import { BanOptions, CommandInteraction, Guild, GuildMember, Interaction, Message, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getMember from '../../utils/getMember';
import PunishmentType from '../../types/PunishmentType';
import Punishment from '../../models/Punishment';
import History from '../../automod/History';

export async function warn(client: DiscordClient, user: User, reason: string | undefined, msg: Message | CommandInteraction, warned_by?: User) {    
    const warning = await Punishment.create({
        guild_id: msg.guild!.id,
        user_id: user.id,
        reason,
        mod_id: warned_by?.id ?? msg.member!.user.id,
        mod_tag: warned_by?.tag ?? (msg.member!.user as User).tag,
        type: PunishmentType.WARNING,
    });

    const strike = await Punishment.count({
        where: {
            guild_id: msg.guild!.id,
            user_id: user.id,
            type: PunishmentType.WARNING,
        }
    });

    // await History.create(user.id, msg.guild!, 'warn', warned_by?.id ?? msg.member!.user.id, reason ?? null);

	let DMed = true;

	try {
	    await user.send({
	        embeds: [
	            new MessageEmbed({
	                author: {
	                    name: `You have been warned in ${msg.guild!.name}`,
	                    iconURL: msg.guild!.iconURL()!
	                },
	                fields: [
	                    {
	                        name: 'Reason',
	                        value: reason ?? '*No reason provided*'
	                    },
	                    {
	                        name: 'Strike',
	                        value: `${strike} time(s)`
	                    }
	                ]
	            })
	        ]
	    });
    }
    catch (e) {
    	console.log(e);
    	DMed = false;	
    }
    
    await client.logger.logWarn(msg, user, (warned_by ?? msg.member!.user) as User, reason, warning.get('id') as number);

    return { warning, strike, DMed };
}

export default class WarnCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('warn', 'moderation', []);
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

        let user: GuildMember;
        let reason: string | undefined;

        if (options.isInteraction) {
            user = await <GuildMember> options.options.getMember('member');

            if (!user) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription("Invalid user given.")
                    ]
                });
    
                return;
            }

            if (options.options.getString('reason')) {
                reason = <string> options.options.getString('reason');
            }
        }
        else {
            try {
                const user2 = await getMember((msg as Message), options);

                if (!user2) {
                    throw new Error('Invalid user');
                }

                user = user2;
            }
            catch (e) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription(`Invalid user given.`)
                    ]
                });
    
                return;
            }

            console.log(user);

            if (options.args[1]) {
                await options.args.shift();
                reason = options.args.join(' ');
            }
        }

        try {
            const { warning, strike, DMed } = await warn(client, user.user, reason, msg, msg.member?.user as User);

            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setDescription(`The user ${user.user.tag} has been warned`)
                    .addFields([
                        {
                            name: "Reason",
                            value: typeof reason === 'undefined' ? '*No reason provided*' : reason
                        },
                        {
                            name: "Strike",
                            value: strike + ' time(s)'
                        },
                        {
                            name: "Warned by",
                            value: (msg.member?.user as User).tag
                        },
                        {
                            name: "ID",
                            value: warning.get('id') + ''
                        },
                        ...(DMed ? {} : {
                        	name: "Note",
                        	value: ":warning: The user has DMs disabled, so they might not know that they've been warned."
                        })
                    ])
                ]
            });
        }
        catch (e) {
            console.log(e);            
        }
    }
}
