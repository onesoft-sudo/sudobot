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

import { CommandInteraction, ContextMenuInteraction, GuildMember, Message, Permissions, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getMember from '../../utils/getMember';
import Punishment from '../../models/Punishment';
import PunishmentType from '../../types/PunishmentType';
import { generateInfractionDescription, hasPermission, shouldNotModerate } from '../../utils/util';

export default class KickCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    supportsContextMenu: boolean = true;
    
    permissions = [Permissions.FLAGS.KICK_MEMBERS];

    constructor() {
        super('kick', 'moderation', ['Kick']);
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
        let reason: string | undefined;

        if (options.isInteraction) {
            user = await <GuildMember> (msg instanceof ContextMenuInteraction ? options.options.getMember('user') : options.options.getMember('member'));

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
        	if (!(await hasPermission(client, user, msg, null, "You don't have permission to kick this user."))) {
        		return;
        	}
        	
            if (!user.kickable || shouldNotModerate(client, user)) 
                throw new Error('User not kickable');
            
            await user.kick(reason);

            const { id } = await Punishment.create({
                type: PunishmentType.KICK,
                user_id: user.id,
                guild_id: msg.guild!.id,
                mod_id: msg.member!.user.id,
                mod_tag: (msg.member!.user as User).tag,
                reason,
                createdAt: new Date()
            });

            try {
                await user.send({
                    embeds: [
                        new MessageEmbed({
                            description: generateInfractionDescription(client, msg.guildId!, 'kick_message')
                        })
                        .setAuthor({
                            iconURL: <string> msg.guild!.iconURL(),
                            name: `\tYou have been kicked from ${msg.guild!.name}`
                        })
                        .setColor('#f14a60')
                        .addField("Reason", reason === undefined || reason.trim() === '' ? "*No reason provided*" : reason)
                        .addFields({
                            name: 'Infraction ID',
                            value: id
                        })
                    ]
                });
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
                    .setDescription(user.user.tag + " has been kicked from this server.")
                    .addFields([
                        {
                            name: "Kicked by",
                            value: (msg.member!.user as User).tag
                        },
                        {
                            name: "Reason",
                            value: reason === undefined ? "*No reason provided*" : reason
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
                    .setDescription("Failed to kick this user. Maybe missing permisions or I'm not allowed to kick this user?")
                ]
            });

            return;
        }
    }
}
