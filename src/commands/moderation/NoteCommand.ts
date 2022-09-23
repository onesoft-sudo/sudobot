
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

import { CommandInteraction, GuildMember, Message, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getUser from '../../utils/getUser';
import { fetchEmoji } from '../../utils/Emoji';

export async function note(user: GuildMember | User, content: string, msg: Message | CommandInteraction) {
    const { default: Note } = await import('../../models/Note');

    return await Note.create({
        content,
        author: msg.member!.user.id,
        mod_tag: (msg.member!.user as User).tag,
        user_id: user.id,
        guild_id: msg.guild!.id,
        createdAt: new Date(),
    });
}

export default class NoteCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('note', 'moderation', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && typeof options.args[1] === 'undefined') {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires at least two arguments.`)
                ]
            });

            return;
        }

        let user: User;
        let content: string | undefined;

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

            content = <string> options.options.getString('note');
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

            await options.args.shift();
            content = options.args.join(' ');
        }

        const n = await note(user, content as string, msg);

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setDescription(`${(await fetchEmoji('check'))?.toString()} A note has been added for ${user.tag}`)
                .setFooter({
                    text: `ID: ${n.id}`
                })
            ]
        });
    }
}