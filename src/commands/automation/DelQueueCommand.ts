
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
import { clearTimeoutv2, getTimeout, getTimeouts } from '../../utils/setTimeout';

export default class DelQueueCommand extends BaseCommand {
    constructor() {
        super('delqueue', 'automation', []);
    }

    async run(client: DiscordClient, msg: Message, options: CommandOptions) {
        if (options.args[0] === undefined) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires at least one argument.`)
                ]
            });

            return;
        }

        const timeout = await getTimeout(parseInt(options.args[0]));
        console.log(getTimeouts());

        if (!timeout || timeout.row.guild_id !== msg.guild!.id) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`Invalid queue ID given.`)
                ]
            });

            return;
        }

        await clearTimeoutv2(timeout);

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setColor('#f14a60')
                .setDescription(`The queue has been deleted.`)
                .addField('Command', `\`${timeout.row.cmd}\``)
                .setFooter({
                    text: 'ID: ' + timeout.row.id
                })
            ]
        });
    }
}