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
import { TextChannel, Collection, User, Message, GuildMember } from 'discord.js';

export default class RawEvent extends BaseEvent {
    events = {
        MESSAGE_REACTION_ADD: 'messageReactionAddRaw',
    };

    constructor() {
        super('raw');
    }
    
    async run(client: DiscordClient, event: { d: any, t: keyof RawEvent['events'] }) {
        if (!this.events.hasOwnProperty(event.t))
            return;
        
        const { d: data } = event;
        // const user = client.users.cache.find(i => i.id === data.user_id);
        console.log(data);
        const channel = <TextChannel> client.channels.cache.find(i => i.id === data.channel_id);

        // if (channel) {        
        //     let message: Message | undefined;

        //     try {
        //         message = await channel.messages.fetch(data.message_id);
        //     }
        //     catch (e) {
        //         console.log(e);
        //     }

        //     if (!message) {
        //         return;
        //     }

        //     let member: GuildMember | undefined;

        //     if (!message.member) {
        //         try {
        //             member = await channel.guild.members.fetch(message.author.id);
        //         }
        //         catch (e) {
        //             console.log(e);
        //         }
    
        //         if (!member) {
        //             return;
        //         }
        //         else {
        //             (message as any).member = member;
        //         }
        //     }
        
        //     if (!message.guild) {
        //         (message as any).guild ??= channel.guild!;
        //         (message as any).guildId ??= channel.guildId!;
        //     }
        
        //     if (!message.channel) {
        //         (message as any).channel ??= channel!;
        //         (message as any).channelId ??= channel.id!;
        //     }

        //     // const emojiKey = (data.emoji.id) ? `${data.emoji.name}:${data.emoji.id}` : data.emoji.name;

        //     console.log("Reactions", message.reactions.cache, data.emoji.id);

        //     const reaction = message.reactions.cache.get(data.emoji.id);
        
        //     client.emit(this.events[event.t], {
        //         ...(reaction ?? {}),
        //         users: reaction ? reaction.users : {
        //             cache: new Collection<string, User>([
        //                 [message.author.id, message.author]
        //             ])
        //         },
        //         message: reaction?.message ?? message,
        //         emoji: reaction?.emoji ?? data.emoji,
        //         remove: reaction?.remove.bind(reaction) ?? null
        //     }, message);
        // }
    }
}