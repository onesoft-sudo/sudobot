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
import Ballot from '../../models/Ballot';
import { isDisabledServer } from '../../utils/util';

export default class MessageDeleteEvent extends BaseEvent {
    constructor() {
        super('messageDelete');
    }

    async run(client: DiscordClient, message: Message) {
        if (isDisabledServer(message.guild!.id)) 
            return;
            
        if (message.author.id === client.user!.id && message.guild && message.channel.type !== 'DM') {
            const { id, channel: { id: channelID }, guild: { id: guildID }, embeds: { length } } = message;

            if (length !== 1) {
                return;
            }

            const ballot = await Ballot.findOne({ msg_id: id, channel_id: channelID, guild_id: guildID });

            if (ballot) {
                await ballot.delete();
                console.log(`Deleted ballot: ${ballot.id}`);
            }

            return;
        }

        if (message.author.bot || !message.guild || message.channel.type === 'DM' || (global as any).deletingMessages === true)
            return;

        await client.logger.onMessageDelete(message);

        if (message.content.trim() !== '')
            client.utils.lastDeletedMessage = message;
    }
}