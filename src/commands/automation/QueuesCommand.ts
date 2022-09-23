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
import { getTimeouts } from '../../utils/setTimeout';
import { timeProcess, timeSince } from '../../utils/util';

export default class QueuesCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('queues', 'automation', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        const map = await getTimeouts();
        let str = '';

        await map.forEach(value => {
            if (value.row.guild_id !== msg.guild!.id)
                return;
            
            console.log(new Date(value.row.time).getTime() - new Date().getTime());
            str += `**ID: ${value.row.id}**\n**User Command**: \`${value.row.cmd}\`\n**Internal Command**: \`${value.row.params}\`\n**ETA**: ${timeProcess((new Date(value.row.time).getTime() - new Date().getTime()) / 1000).replace(' ago', '')}\n**Queue Added**: ${value.row.createdAt.toLocaleString()} (${timeSince(value.row.createdAt.getTime())})\n\n`;
        });

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setTitle('Queue List')
                .setDescription(str === '' ? 'No queue.' : str)
                .setTimestamp()
            ]
        });
    }
}