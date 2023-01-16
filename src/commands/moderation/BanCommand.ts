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

import { Permissions, BanOptions, CommandInteraction, Message, User, GuildBan } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getUser from '../../utils/getUser';
import Punishment from '../../models/Punishment';
import PunishmentType from '../../types/PunishmentType';
import { shouldNotModerate, hasPermission, generateInfractionDescription } from '../../utils/util';

export default class BanCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    supportsContextMenu: boolean = true;
    permissions = [Permissions.FLAGS.BAN_MEMBERS];

    constructor() {
        super('ban', 'moderation', ['Ban']);
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
        let banOptions: BanOptions = {};

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

		try {
        	const member = await msg.guild?.members.fetch(user.id);

			if (member && !(await hasPermission(client, member, msg, null, "You don't have permission to ban this user."))) {
				return;
			}

			if (member && shouldNotModerate(client, member)) {
				await msg.reply({
					embeds: [
						new MessageEmbed()
						.setColor('#f14a60')
						.setDescription('Cannot ban this user: Operation not permitted')	
					]
				});
				
				return;
			}
		}
		catch (e) {
			console.log(e);
		}
		
        try {
            await msg.guild?.bans.create(user, { ...banOptions, reason: `[BAN] ${banOptions.reason ?? '**No reason provided**'}` });

            const { id } = await Punishment.create({
                type: PunishmentType.BAN,
                user_id: user.id,
                guild_id: msg.guild!.id,
                mod_id: msg.member!.user.id,
                mod_tag: (msg.member!.user as User).tag,
                reason: banOptions.reason ?? undefined,
                createdAt: new Date()
            });

            user.send({
                embeds: [
                    new MessageEmbed({
                        author: {
                            name: `You have been banned in ${msg.guild!.name}`,
                            iconURL: msg.guild!.iconURL() ?? undefined
                        },
                        color: 0xf14a60,
                        description: generateInfractionDescription(client, msg.guildId!, 'ban_message'),
                        fields: [
                            {
                                name: 'Reason',
                                value: banOptions.reason === undefined ? "*No reason provided*" : banOptions.reason
                            },
                            {
                                name: 'Infraction ID',
                                value: id
                            }
                        ]
                    })
                ]
            }).catch(console.error);

            client.logger.onGuildBanAdd({
                guild: msg.guild!,
                user,
                reason: banOptions.reason === undefined ? "*No reason provided*" : banOptions.reason
            } as GuildBan, msg.member!.user as User, id).catch(console.error);

            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setAuthor({
                        name: user.tag,
                        iconURL: user.displayAvatarURL(),
                    })
                    .setDescription(user.tag + " has been banned from this server.")
                    .addFields([
                        {
                            name: "Banned by",
                            value: (msg.member!.user as User).tag
                        },
                        {
                            name: "Reason",
                            value: banOptions.reason === undefined ? "*No reason provided*" : banOptions.reason
                        },
                        {
                            name: "Days of message deletion",
                            value: banOptions.days === undefined ? "*No message will be deleted*" : (banOptions.days + '')
                        },
                        {
                            name: 'Infraction ID',
                            value: id
                        }
                    ])
                ]
            });
        }
        catch (e) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription("Failed to ban this user. Maybe missing permisions or I'm not allowed to ban this user?")
                ]
            });

            return;
        }
    }
}
