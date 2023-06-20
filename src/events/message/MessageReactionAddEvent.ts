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
import { Message, MessageReaction, ReactionUserManager, TextChannel } from 'discord.js';
import { mute } from '../../commands/moderation/MuteCommand';
import { clearMessages } from '../../commands/moderation/ClearCommand';
import { isDisabledServer } from '../../utils/util';

export default class MessageReactionAddEvent extends BaseEvent {
    constructor() {
        super('messageReactionAdd');
    }
    
    async run(client: DiscordClient, reaction: MessageReaction) {
        if (isDisabledServer(reaction.message.guildId!)) 
            return;
            
        console.log('inside');
        
        console.log(reaction);

        if (!reaction || !reaction.message.guild || reaction.message.channel.type === 'DM') {
            return;
        }
        
        await (client.msg = <Message> reaction.message);
        await client.starboard.handle(reaction);

        const tempmuteConfig = client.config.props[reaction.message.guildId!].tempmute;

        if (tempmuteConfig && reaction.emoji.id && reaction.emoji.id === tempmuteConfig.emoji && reaction.count === 1 && reaction.message.author!.id !== client.user!.id) {
            console.log("Report received");

            try {
                try {
                    if (!(reaction.users as ReactionUserManager | undefined)) {
                        await reaction.users.fetch();
                    }
                }
                catch (e) {
                    console.log(e);
                }
                
                const user = reaction.users.cache.first();

                if (!user)
                    return;

                console.log('user', user.id);

                const member = await reaction.message.guild!.members.fetch(user.id);

                if (!member)
                    return;

                console.log('member');

                if (!member.roles.cache.has(client.config.props[reaction.message.guildId!].mod_role)) {
                    reaction.remove().catch(console.log);
                    return;
                }

                const authorMember = await reaction.message.guild!.members.fetch(reaction.message.author!.id); 

                if (!authorMember) {
                    console.log("Member is null");
                    return;
                }

                if (authorMember.roles.cache.has(client.config.props[reaction.message.guildId!].mod_role)) {
                    reaction.remove().catch(console.log); 
                    return;
                }

                const role = await reaction.message.guild!.roles.fetch(client.config.props[reaction.message.guild!.id].mute_role);
                await reaction.message.member!.roles.add(role!, tempmuteConfig.reason ?? undefined);
                
                await clearMessages(reaction.message.channel! as TextChannel, {
                    count: 50,
                    user_id: reaction.message.author!.id,
                    output: true
                });

                await mute(client, Date.now() + tempmuteConfig.duration, reaction.message.member!, {
                    guild: reaction.message.guild!,
                    member: reaction.message.member!,
                }, tempmuteConfig.duration, tempmuteConfig.reason ?? undefined, false, user);
            }
            catch (e) {
                console.log(e);
            }
        }
    }
}