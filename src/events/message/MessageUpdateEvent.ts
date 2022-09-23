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

import BaseEvent from '../../utils/structures/BaseEvent';
import { Message } from 'discord.js';
import DiscordClient from '../../client/Client';

export default class MessageUpdateEvent extends BaseEvent {
    constructor() {
        super('messageUpdate');
    }

    async run(client: DiscordClient, oldMessage: Message, newMessage: Message) {
        if (oldMessage.author.bot || !oldMessage.guild || oldMessage.channel.type === 'DM' || oldMessage.content === newMessage.content)
            return;

        let msg = await client.msg;
        await (client.msg = newMessage);
    
        await client.messageFilter.start(newMessage);
        // await client.messageFilter.start(newMessage, this.commandManager);

        await client.logger.logEdit(oldMessage, newMessage);
        await (client.msg = msg);
    }
}