import { BanOptions, CommandInteraction, ContextMenuInteraction, GuildMember, Interaction, Message, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getUser from '../../utils/getUser';
import getMember from '../../utils/getMember';
import History from '../../automod/History';
import Punishment from '../../models/Punishment';
import PunishmentType from '../../types/PunishmentType';
import ModerationEmbed from '../../utils/ModerationEmbed';

export default class ShotCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    supportsContextMenu: boolean = true;

    constructor() {
        super('shot', 'moderation', ['Shot']);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction | ContextMenuInteraction, options: CommandOptions | InteractionOptions) {
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
        let dm = true;
        let reason: string | undefined;

        if (options.isInteraction) {
            user = await <GuildMember> (msg instanceof ContextMenuInteraction ? options.options.getMember('user') : options.options.getMember('member'));

            if (!user) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription("Invalid member given.")
                    ]
                });
    
                return;
            }

            if (options.options.getString('reason')) {
                reason = await <string> options.options.getString('reason');
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
                const args = [...options.args];
                args.shift();
                reason = await args.join(' ');
            }
        }

        try {            
            await Punishment.create({
                type: PunishmentType.SHOT,
                user_id: user.id,
                guild_id: msg.guild!.id,
                mod_id: msg.member!.user.id,
                mod_tag: (msg.member!.user as User).tag,
                reason,
                createdAt: new Date()
            });

            // await History.create(user.id, msg.guild!, 'bean', msg.member!.user.id, typeof reason === 'undefined' ? null : reason);

		    try {
		        await user.send({
		            embeds: [
		                new MessageEmbed()
		                    .setAuthor({
		                        iconURL: <string> msg.guild!.iconURL(),
		                        name: `\tYou got a shot in ${msg.guild!.name}`
		                    })
		                    .addFields([
		                        {
		                            name: "Reason",
		                            value: typeof reason === 'undefined' ? '*No reason provided*' : reason
		                        }
		                    ])
		            ]
		        });
            }
            catch (e) {
            	console.log(e);
            	dm = false;
            }

            // await client.logger.logBeaned(user, typeof reason === 'undefined' ? '*No reason provided*' : reason, msg.member!.user as User);
        }
        catch (e) {
            console.log(e);            
        }

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setAuthor({
                    name: user.user.tag,
                    iconURL: user.user.displayAvatarURL(),
                })
                .setDescription(user.user.tag + " got a shot." + (!dm ? "\nThey have DMs disabled. They will not know that they got a shot." : ''))
                .addFields([
                    {
                        name: "Given by",
                        value: (msg.member!.user as User).tag
                    },
                    {
                        name: "Reason",
                        value: reason === undefined ? "*No reason provided*" : reason
                    }
                ])
            ]
        });
    }
}
