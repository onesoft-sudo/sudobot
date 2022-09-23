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

import { BanOptions, CommandInteraction, Message, User, Permissions } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getUser from '../../utils/getUser';
import Punishment from '../../models/Punishment';
import PunishmentType from '../../types/PunishmentType';
import { fetchEmojiStr } from '../../utils/Emoji';
import { hasPermission, shouldNotModerate } from '../../utils/util';

export default class SoftBanCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    permissions = [Permissions.FLAGS.BAN_MEMBERS];

    constructor() {
        super('softban', 'moderation', []);
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

        let user: User;
        let banOptions: BanOptions = {
            days: 7
        };

        if (options.isInteraction) {
            user = await <User> options.options.getUser('user');

            if (options.options.getString('reason')) {
                banOptions.reason = await <string> options.options.getString('reason');
            }

            if (options.options.getInteger('days')) {
                banOptions.days = await <number> options.options.getInteger('days');
            }
        }
        else {
            const user2 = await getUser(client, (msg as Message), options);

            if (!user2) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription(`Invalid user given.`)
                    ]
                });
    
                return;
            }

            user = user2;

            const index = await options.args.indexOf('-d');

            if (options.args[1]) {
                const args = [...options.args];
                args.shift();

                if (index !== -1) {
                    args.splice(index - 1, 2)
                }

                banOptions.reason = await args.join(' ');
            }

            if (index !== -1) {
                const days = await options.args[index + 1];

                if (days === undefined) {
                    await msg.reply({
                        embeds: [
                            new MessageEmbed()
                            .setColor('#f14a60')
                            .setDescription(`Option \`-d\` (days) requires an argument.`)
                        ]
                    });
        
                    return;
                }

                if (!parseInt(days) || parseInt(days) < 0 || parseInt(days) > 7) {
                    await msg.reply({
                        embeds: [
                            new MessageEmbed()
                            .setColor('#f14a60')
                            .setDescription(`Option \`-d\` (days) requires an argument which must be a valid number and in range of 0-7.`)
                        ]
                    });
        
                    return;
                }

                banOptions.days = await parseInt(days);
            }
        }
        
        let reply = await msg.reply({
            embeds: [
                new MessageEmbed({
                    author: {
                        name: user.tag,
                        iconURL: user.displayAvatarURL()
                    },
                    description: `${await fetchEmojiStr('loading')} Softban is in progress...`,
                    color: 'GOLD'
                })
            ]
        });
        
        if (msg instanceof CommandInteraction)
            reply = <Message> await msg.fetchReply();

        try {
        	try {
        		const member = await msg.guild!.members.fetch(user.id);

				if (member && !(await hasPermission(client, member, msg, null, "You don't have permission to softban this user."))) {
					return;
				}

        		if (member && shouldNotModerate(client, member)) {
        			await msg.reply({
        				embeds: [
        					new MessageEmbed()
        					.setColor('#f14a60')
        					.setDescription('This user cannot be softbanned.')
        				]
        			});

        			return;
        		}
        	}
        	catch (e) {
        		console.log(e);
        	}
        	
            await msg.guild?.bans.create(user, banOptions);
            await new Promise(r => setTimeout(r, 1600));
            await msg.guild?.bans.remove(user);

            const punishment = await Punishment.create({
                type: PunishmentType.SOFTBAN,
                user_id: user.id,
                guild_id: msg.guild!.id,
                mod_id: msg.member!.user.id,
                mod_tag: (msg.member!.user as User).tag,
                reason: banOptions.reason ?? undefined,
                meta: {
                    days: banOptions.days
                },
                createdAt: new Date()
            });

            await client.logger.logSoftBan(banOptions, msg.guild!, user, punishment);

            await reply!.edit({
                embeds: [
                    new MessageEmbed({
                        author: {
                            name: user.tag,
                            iconURL: user.displayAvatarURL()
                        },
                        description: `${await fetchEmojiStr('check')} Softbanned user ${user.tag}`,
                        fields: [
                            {
                                name: 'Softbanned by',
                                value: (<User> msg.member?.user).tag
                            },
                            {
                                name: 'Reason',
                                value: banOptions.reason ?? '*No reason provided*'
                            }
                        ]
                    })
                ]
            });
        }
        catch (e) {
            await reply!.edit({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription("Failed to softban this user. Maybe missing permisions or I'm not allowed to ban this user?")
                ]
            });

            return;
        }
    }
}
