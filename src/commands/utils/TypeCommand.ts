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
import ms from 'ms';
import { emoji } from '../../utils/Emoji';

export default class TypeCommand extends BaseCommand {
    ownerOnly: boolean = true;
    
    constructor() {
        super('type', 'utils', ['starttyping']);
    }

    async run(client: DiscordClient, message: Message, options: CommandOptions) {
        const duration = options.args[0] ? ms(options.args[0]) : null;

        if (Number.isNaN(duration)) {
            await message.reply(`${emoji('error')} Not a valid time duration.`);
            return;
        }
        
        if (client.utils.typingInterval) {
            clearInterval(client.utils.typingInterval);
        }

        if (client.utils.typingTimeOut) {
            clearTimeout(client.utils.typingTimeOut);
        }

        await message.channel.sendTyping().catch(e => {
            console.log(e);

            if (client.utils.typingInterval) {
                clearInterval(client.utils.typingInterval);
            }
        });

        client.utils.typingInterval = setInterval(() => {
            message.channel.sendTyping().catch(e => {
                console.log(e);

                if (client.utils.typingInterval) {
                    clearInterval(client.utils.typingInterval);
                }
            });
        }, 15_000);

        if (duration)
            client.utils.typingTimeOut = setTimeout(() => {
                if (client.utils.typingInterval) {
                    clearInterval(client.utils.typingInterval);
                }
            }, duration);

        message.react(emoji('check') as string).catch(console.error);
    }
}