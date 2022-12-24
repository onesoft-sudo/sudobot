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

import { CommandInteraction, ContextMenuInteraction, GuildMember, Message, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getMember from '../../utils/getMember';
import Punishment from '../../models/Punishment';
import PunishmentType from '../../types/PunishmentType';

export default class BeanCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    supportsContextMenu: boolean = true;

    constructor() {
        super('bean', 'moderation', []);
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
        let dm = true;
        let reason: string | undefined;
        
        if (msg instanceof CommandInteraction) {
            await msg.deferReply();   
        }
        
        if (options.isInteraction) {
            user = await <GuildMember> options.options.getMember('member');

            if (!user) {
                await this.deferReply(msg, {
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
                await this.deferReply(msg, {
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

        if (user.id === client.user?.id) {
            const random = Math.random() >= 0.5;
            
            await this.deferReply(msg, {
                content: `Oh no no no... wait wait, you can't just do that with me${random ? "... I'm such an innocent bot :innocent:, PWEASE don't do that :pleading_face:" : "!?!? Can you?"}`,
                files: [random ? "https://tenor.com/view/folded-hands-emoji-funny-animals-gray-cat-cute-pwease-gif-14039745.gif" : 'https://tenor.com/view/are-you-even-capable-vera-bennett-wentworth-can-you-handle-this-are-you-qualified-gif-22892513.gif']
            });

            return;
        }

        try {            
            await Punishment.create({
                type: PunishmentType.BEAN,
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
		                        name: `\tYou've been beaned in ${msg.guild!.name}`
		                    })
		                    .addFields([
		                        {
		                            name: "Reason",
		                            value: typeof reason === 'undefined' ? '*No reason provided*' : reason
		                        },
		                    ])
		            ]
		        });
            }
            catch (e) {
            	console.log(e);
            	dm = false;
            }

            // client.logger.onMemberShot(user, msg.member!.user as User, reason);
        }
        catch (e) {
            console.log(e);            
        }

        await this.deferReply(msg, {
            embeds: [
                new MessageEmbed()
                .setAuthor({
                    name: user.user.tag,
                    iconURL: user.user.displayAvatarURL(),
                })
                .setDescription(user.user.tag + " has been beaned." + (!dm ? "\nThey have DMs disabled. They will not know that they were beaned." : ''))
                .addFields([
                    {
                        name: "Beaned by",
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
