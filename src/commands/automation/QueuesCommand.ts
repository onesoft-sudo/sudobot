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

import { CommandInteraction, Message, Permissions } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import { timeProcess, timeSince } from '../../utils/util';

export default class QueuesCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    permissions = [Permissions.FLAGS.MANAGE_MESSAGES];

    constructor() {
        super('queues', 'automation', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        const map = [...client.queueManager.queues.values()].slice(0, 8);
        let str = '';

        await map.forEach(value => {
            if (value.guild !== msg.guild!.id)
                return;
            
            console.log(new Date(value.runOn).getTime() - new Date().getTime());
            str += `**ID: ${value.id}**\n`;
            
            if (value.data?.cmd) {
                `**Command**: \`${value.data.cmd}\`\n`;
            }

            str += `**ETA**: ${timeProcess((new Date(value.runOn).getTime() - new Date().getTime()) / 1000).replace(' ago', '')}\n**Queue Added**: ${value.model.createdAt.toLocaleString()} (${timeSince(value.model.createdAt.getTime())})\n\n`;
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