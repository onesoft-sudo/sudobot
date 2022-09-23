
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
import { fetchEmoji } from '../../utils/Emoji';
import { formatDuration, intervalToDuration } from 'date-fns';
import os from 'os';

export default class SystemCommand extends BaseCommand {
    constructor() {
        super('system', 'settings', []);
        this.supportsInteractions = true;
    }

    async run(client: DiscordClient, message: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {    
        let msg: Message;

        if (message instanceof Message) {
            msg = await message.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('GOLD')
                    .setDescription('Loading data...')
                ]
            });
        }
        else {
            await message.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('GOLD')
                    .setDescription('Loading data...')
                ]
            });
            msg = <Message> await message.fetchReply();
        }

        const latency = msg.createdTimestamp - message.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);
        let latencyIcon = '🟢', apiLatencyIcon = '🟢';

        if (latency >= 500) {
            latencyIcon = '🔴';
        }
        else if (latency >= 350) {
            latencyIcon = '🟡';
        }

        if (apiLatency >= 400) {
            apiLatencyIcon = '🔴';
        }
        else if (apiLatency >= 300) {
            apiLatencyIcon = '🟡';
        }

        const memoryTotal = Math.round(os.totalmem() / 1024 / 1024);
        const memoryUsed = Math.round((os.totalmem() - os.freemem()) / 1024 / 1024);
        const memoryUsedByBot = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

        const msgoptions: any = {
            embeds: [
                new MessageEmbed()
                .setAuthor({
                    iconURL: client.user!.displayAvatarURL(),
                    name: 'System status'
                })
                .setDescription((latencyIcon !== '🔴' ? (await fetchEmoji('check'))?.toString() + ' All systems operational' : ':x: Some systems are down/slow'))
                .addFields([
                    {
                        name: 'Command Type',
                        value: `${!options.isInteraction ? 'Legacy (Message-based)' : 'Slash Command'}`
                    },
                    {
                        name: 'Uptime',
                        value: `${formatDuration(intervalToDuration({
                            start: 0,
                            end: process.uptime() * 1000
                        }))}`
                    },
                    {
                        name: 'Latency',
                        value: `${latencyIcon} ${latency}ms`
                    },
                    {
                        name: 'API Latency',
                        value: `${apiLatencyIcon} ${apiLatency}ms`
                    },
                    {
                        name: 'Memory Usage',
                        value: `${memoryUsed}MB / ${memoryTotal}MB (${memoryUsedByBot}MB used by the bot)`
                    },
                    {
                        name: 'System Platform',
                        value: `${process.platform}`
                    },
                    {
                        name: 'NodeJS Version',
                        value: `${process.version}`
                    }
                ])
            ]
        };

        if (msg instanceof CommandInteraction)
            msgoptions.content = '';

        await this.deferReply(msg, msgoptions, true);
    }
}