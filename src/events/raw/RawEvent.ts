
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
import DiscordClient from '../../client/Client';
import { TextChannel } from 'discord.js';

export default class RawEvent extends BaseEvent {
    events = {
        MESSAGE_REACTION_ADD: 'messageReactionAdd',
    };

    constructor() {
        super('raw');
    }
    
    async run(client: DiscordClient, event: { d: any, t: keyof RawEvent['events'] }) {
        if (!this.events.hasOwnProperty(event.t))
            return;
        
        const { d: data } = event;
        // const user = client.users.cache.find(i => i.id === data.user_id);
        const channel = <TextChannel> client.channels.cache.find(i => i.id === data.channel_id);
    
        if (channel) {
            if (channel.messages.cache.has(data.message_id)) 
                return;
        
            const message = await channel.messages.fetch(data.message_id);
        
            const emojiKey = (data.emoji.id) ? `${data.emoji.name}:${data.emoji.id}` : data.emoji.name;
            const reaction = message.reactions.cache.get(emojiKey);
        
            client.emit(this.events[event.t], reaction, message);
        }
    }
}