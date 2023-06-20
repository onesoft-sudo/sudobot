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

import { GuildMember } from "discord.js";
import DiscordClient from "../../client/Client";
import BaseEvent from "../../utils/structures/BaseEvent";
import { isDisabledServer } from "../../utils/util";

export default class GuildMemberUpdateEvent extends BaseEvent {
    constructor() {
        super('guildMemberUpdate');
    }

    async run(client: DiscordClient, oldMember: GuildMember, newMember: GuildMember) {
        if (newMember.user.bot) {
            return;
        }

        if (isDisabledServer(newMember.guild.id)) 
            return;
        
        client.logger.onMemberUpdate(oldMember, newMember);
        
        if (oldMember.premiumSinceTimestamp !== newMember.premiumSinceTimestamp) {
            if (oldMember.premiumSince !== null && newMember.premiumSince === null) {
                await client.logger.onServerUnboost(oldMember, newMember);
            }
        }

        if (newMember.nickname === oldMember.nickname && newMember.user.tag === oldMember.user.tag) {
            return;
        }

        console.log("Here");

        client.logger.onNicknameChange(oldMember, newMember).catch(console.error);
        client.profileFilter.check(newMember).catch(console.error);
    }
}