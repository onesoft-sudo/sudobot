
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

import { Message } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import MessageEmbed from '../../client/MessageEmbed';
import ms from 'ms';
import { timeSince } from '../../utils/util';
import { setTimeoutv2 } from '../../utils/setTimeout';

export default class AddQueueCommand extends BaseCommand {
    constructor() {
        super('addqueue', 'automation', []);
    }

    async run(client: DiscordClient, msg: Message, options: CommandOptions) {
        if (options.args[1] === undefined) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires at least two arguments.`)
                ]
            });

            return;
        }

        const time = await ms(options.args[0]);
        let cmd: string[];

        if (!time) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`Invalid time interval given.`)
                ]
            });

            return;
        }

        cmd = [...options.args];
        cmd.shift();

        const cmdObj = client.commands.get(cmd[0]);

        if (!cmdObj) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`Invalid command given.`)
                ]
            });

            return;
        }

        if (!cmdObj.supportsLegacy) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command conflicts with queued jobs.`)
                ]
            });

            return;
        }

        const command = await cmd.join(' ');

        const queue = await setTimeoutv2('queue', time, msg.guild!.id, command, command, msg.id, msg.channel!.id, msg.guild!.id);

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setColor('#007bff')
                .setDescription(`The queue has been added.`)
                .setFields([
                    {
                        name: "ID",
                        value: queue.row.id + '',
                    },
                    {
                        name: "Command",
                        value: `\`${command}\``
                    },
                    {
                        name: "Time",
                        value: "After " + timeSince(Date.now() - time).replace(' ago', '')
                    }
                ])
            ]
        });
    }
}