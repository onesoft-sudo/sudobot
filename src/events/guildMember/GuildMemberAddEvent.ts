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
import { GuildMember } from 'discord.js';
import autoRole from '../../services/AutoRole';
import GuildInfo, { IGuildInfo } from '../../models/GuildInfo';

export default class GuildMemberAddEvent extends BaseEvent {
    constructor() {
        super('guildMemberAdd');
    }
    
    async run(client: DiscordClient, member: GuildMember) {
        if (member.user.id === client.user!.id)
            return;
        
        let info: IGuildInfo | undefined | null;

        try {
            info = await GuildInfo.findOneAndUpdate({ 
                guild_id: member.guild.id 
            }, {
                $inc: {
                    totalMembersJoined: 1
                },
                updatedAt: new Date()
            }, {
                new: true,
                upsert: true
            });
        }
        catch (e) {
            console.log(e);
        }

        await client.logger.onGuildMemberAdd(member, info ?? undefined);
        
        if (member.user.bot)
            return;

        if (await client.antijoin.start(member)) {
            return;
        }
        
        await client.antiraid.start(member);
        await autoRole(client, member);

        await client.welcomer.start(member);

        if (client.config.props[member.guild.id].verification.enabled) {
            await client.verification.start(member);
        }

        if (!(await client.profileFilter.check(member))) {
            await client.automute.onMemberJoin(member);
            console.log("Run automute");
        }
    }
}