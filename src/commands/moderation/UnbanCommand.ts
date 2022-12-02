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

import { CommandInteraction, Message, User, Permissions, GuildBan } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getUser from '../../utils/getUser';
import Punishment from '../../models/Punishment';
import PunishmentType from '../../types/PunishmentType';
import UnbanQueue from '../../queues/UnbanQueue';

export default class UnbanCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    permissions = [Permissions.FLAGS.BAN_MEMBERS];

    constructor() {
        super('unban', 'moderation', []);
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

        if (options.isInteraction) {
            user = await <User> options.options.getUser('user');

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
        }
        else {
            try {
                const user2 = await getUser(client, (msg as Message), options);

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
        }

        try {
            for await (const queue of client.queueManager.queues.values()) {
                if (queue instanceof UnbanQueue && queue.data!.userID === user.id && queue.data!.guildID === msg.guild!.id) {
                    await queue.cancel();
                }
            }

            await msg.guild?.bans.remove(user);

            client.logger.onGuildBanRemove({
                guild: msg.guild!,
                user
            } as GuildBan, msg.member!.user as User).catch(console.error);

            await Punishment.create({
                type: PunishmentType.UNBAN,
                user_id: user.id,
                guild_id: msg.guild!.id,
                mod_id: msg.member!.user.id,
                mod_tag: (msg.member!.user as User).tag,
                createdAt: new Date()
            });
        }
        catch (e) {
            console.log(e);            
        }

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setAuthor({
                    name: user.tag,
                    iconURL: user.displayAvatarURL(),
                })
                .setDescription(user.tag + " has been unbanned.")
                .addFields([
                    {
                        name: "Unbanned by",
                        value: (msg.member!.user as User).tag
                    },
                ])
            ]
        });
    }
}