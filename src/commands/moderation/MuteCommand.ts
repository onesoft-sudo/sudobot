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

import { CommandInteraction, Guild, GuildMember, Message, Permissions, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getMember from '../../utils/getMember';
import ms from 'ms';
import PunishmentType from '../../types/PunishmentType';
import { hasPermission, shouldNotModerate } from '../../utils/util';
import UnmuteQueue from '../../queues/UnmuteQueue';
import { formatDistanceToNowStrict } from 'date-fns';

export async function mute(client: DiscordClient, dateTime: number | undefined, user: GuildMember, msg: Message | CommandInteraction | { guild: Guild, member: GuildMember, editReply?: undefined }, timeInterval: number | undefined, reason: string | undefined, hard: boolean = false, mod?: User) {
    try {
        const { default: Punishment } = await import('../../models/Punishment');
        
        const { getTimeouts, clearTimeoutv2 } = await import('../../utils/setTimeout');

        const timeouts = getTimeouts();
        
        for (const timeout of timeouts.values()) {
            if (timeout.row.params) {
                try {
                    const json = JSON.parse(timeout.row.params);

                    if (json) {
                        if (json[1] === user.id && timeout.row.filePath.endsWith('unmute-job')) {
                            await clearTimeoutv2(timeout);
                        }
                    }
                }
                catch (e) {
                    console.log(e);                    
                }
            }
        }

        if (dateTime && timeInterval) {
            // await setTimeoutv2('unmute-job', timeInterval, msg.guild!.id, `unmute ${user.id}`, msg.guild!.id, user.id);
            for await (const queue of client.queueManager.queues.values()) {
                if (queue instanceof UnmuteQueue && queue.data!.memberID === user.id && queue.data!.guildID === msg.guild!.id) {
                    await queue.cancel();
                }
            }

            await client.queueManager.addQueue(UnmuteQueue, {
                data: {
                    guildID: msg.guild!.id,
                    memberID: user.id
                },
                runAt: new Date(Date.now() + timeInterval),
                guild: msg.guild!.id
            });
        }
        
        if (hard) {
            const { default: Hardmute } = await import("../../models/Hardmute");
            const roles = await user.roles.cache.filter(r => r.id !== msg.guild!.id);
            await user.roles.remove(roles, reason);

            await Hardmute.create({
                user_id: user.id,
                roles: roles.map(role => role.id),
                guild_id: msg.guild!.id,
                createdAt: new Date()
            });
        }

        const role = await msg.guild!.roles.fetch(client.config.props[msg.guild!.id].mute_role);
        await user.roles.add(role!, reason);

        await Punishment.create({
            type: hard ? PunishmentType.HARDMUTE : PunishmentType.MUTE,
            user_id: user.id,
            guild_id: msg.guild!.id,
            mod_id: (mod ?? msg.member!.user).id,
            mod_tag: ((mod ?? msg.member!.user) as User).tag,
            reason,
            meta: {
                time: timeInterval ? ms(timeInterval) : undefined
            },
            createdAt: new Date()
        });
        
        await client.logger.onMemberMute(user, timeInterval, reason === undefined || reason.trim() === '' ? "*No reason provided*" : reason, (mod ?? msg.member!.user) as User, hard);

		try {
	        await user.send({
	            embeds: [
	                new MessageEmbed()
	                .setAuthor({
	                    iconURL: <string> msg.guild!.iconURL(),
	                    name: `\tYou have been muted in ${msg.guild!.name}`
	                })
                    .setColor('#f14a60')
	                .addField("Reason", reason === undefined || reason.trim() === '' ? "*No reason provided*" : reason)
                    .addFields({
                        name: 'Duration',
                        value: `${timeInterval ? `${formatDistanceToNowStrict(new Date(Date.now() + timeInterval))}` : '*No duration specified*'}`
                    })
	            ]
	        });
        }
        catch (e) {
        	console.log(e);
        }
    }
    catch (e) {
        console.log(e);
        
        if (msg instanceof Message)
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription("Failed to assign the muted role to this user. Maybe missing permisions/roles or I'm not allowed to assign roles this user?")
                ]
            });
        else if (msg.editReply)
            await msg.editReply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription("Failed to assign the muted role to this user. Maybe missing permisions/roles or I'm not allowed to assign roles this user?")
                ]
            });

        return;
    }
}

export default class MuteCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    permissions = [Permissions.FLAGS.MODERATE_MEMBERS];

    constructor() {
        super('mute', 'moderation', []);
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

        let user: GuildMember;
        let reason: string | undefined;
        let time: string | undefined;
        let timeInterval: number | undefined;
        let dateTime: number | undefined;
        let hard: boolean = false;

        if (options.isInteraction) {
            user = await <GuildMember> options.options.getMember('member');

            if (options.options.getString('reason')) {
                reason = await <string> options.options.getString('reason');
            }

            if (options.options.getBoolean('hardmute')) {
                hard = await <boolean> options.options.getBoolean('hardmute');
            }

            if (options.options.getString('time')) {
                time = await options.options.getString('time') as string;
                timeInterval = await ms(time);

                if (!timeInterval) {
                    await this.deferReply(msg, {
                        embeds: [
                            new MessageEmbed()
                            .setColor('#f14a60')
                            .setDescription(`Option \`-t\` (time) requires an argument which must be a valid time interval.`)
                        ]
                    });
        
                    return;
                }
            }
        }
        else {
            const user2 = await getMember((msg as Message), options);

            if (!user2) {
                await this.deferReply(msg, {
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription(`Invalid user given.`)
                    ]
                });
    
                return;
            }

            user = user2;

            const index = await options.args.indexOf('-t');

            if (options.args[1]) {
                const args = [...options.args];
                args.shift();

                if (index !== -1) {
                    args.splice(index - 1, 2);
                }

                reason = await args.join(' ');
            }

            if (index !== -1) {
                time = await options.args[index + 1];

                if (time === undefined) {
                    await this.deferReply(msg, {
                        embeds: [
                            new MessageEmbed()
                            .setColor('#f14a60')
                            .setDescription(`Option \`-t\` (time) requires an argument.`)
                        ]
                    });
        
                    return;
                }

                if (!ms(time)) {
                    await this.deferReply(msg, {
                        embeds: [
                            new MessageEmbed()
                            .setColor('#f14a60')
                            .setDescription(`Option \`-t\` (time) requires an argument which must be a valid time interval.`)
                        ]
                    });
        
                    return;
                }

                timeInterval = await ms(time);
            }
        }

        if (timeInterval) {
            dateTime = Date.now() + timeInterval;
        }

		if (!(await hasPermission(client, user, msg, null, "You don't have permission to mute this user."))) {
			return;
		}
		
		if (shouldNotModerate(client, user)) {
			await msg.reply({
				embeds: [
					{
						description: "This user cannot be muted."
					}
				]
			});

			return;
		}
		
        await mute(client, dateTime, user, msg, timeInterval, reason, hard);

        const fields = [
            {
                name: "Muted by",
                value: (msg.member!.user as User).tag
            },
            {
                name: "Reason",
                value: reason === undefined || reason.trim() === '' ? "*No reason provided*" : reason
            },
            {
                name: "Duration",
                value: time === undefined ? "*No duration set*" : (time + '')
            },
            {
                name: "Role Takeout",
                value: hard ? 'Yes' : 'No'
            }
        ];

        console.log(fields);        

        await this.deferReply(msg, {
            embeds: [
                new MessageEmbed()
                .setAuthor({
                    name: user.user.tag,
                    iconURL: user.displayAvatarURL(),
                })
                .setDescription(user.user.tag + " has been muted.")
                .addFields(fields)
            ]
        });
    }
}
