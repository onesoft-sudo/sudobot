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

import { CommandInteraction, Message } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import Note from '../../models/Note';
import { fetchEmojiStr } from '../../utils/Emoji';

export default class NotedelCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('notedel', 'moderation', []);
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

        await note.delete();

        await msg.reply({
            embeds: [
                new MessageEmbed({
                    description: `${await fetchEmojiStr('check')} Note deleted.`
                })
            ]
        });
    }
}