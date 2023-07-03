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

import { CommandInteraction, Message, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import { fetchEmojiStr } from '../../utils/Emoji';
import Note from '../../models/Note';
import { Permissions } from 'discord.js';

export default class NotegetCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    permissions = [Permissions.FLAGS.MANAGE_MESSAGES];

    constructor() {
        super('noteget', 'moderation', []);
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

        let id: string;

        if (options.isInteraction) {
            id = await <string> options.options.getString('id');
        }
        else {
            id = await options.args[0];
        }

        const note = await Note.findOne({
            guild_id: msg.guild!.id,
            _id: id
        });

        if (!note) {
            await msg.reply(`${await fetchEmojiStr('error')} Invalid note ID.`);
            return;
        }

        let user;

        try {
            user = await client.users.fetch(note.user_id);
        }
        catch (e) {
            console.log(e);            
        }

        await msg.reply({
            embeds: [
                new MessageEmbed({
                    author: {
                        name: user?.tag ?? note.user_id,
                        iconURL: user instanceof User ? user.displayAvatarURL() : undefined,
                    },
                    description: note.content,
                    fields: [
                        {
                            name: 'Note taken by',
                            value: note.mod_tag
                        }
                    ],
                    footer: {
                        text: `ID: ${note.id}`
                    },
                    timestamp: note.createdAt
                })
            ]
        });
    }
}