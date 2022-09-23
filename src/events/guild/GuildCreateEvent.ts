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
import { LogLevel } from '../../services/DebugLogger';
import { Guild } from 'discord.js';

export default class GuildCreateEvent extends BaseEvent {
    constructor() {
        super('guildCreate');
    }
    
    async run(client: DiscordClient, guild: Guild) {
        await client.debugLogger.logLeaveJoin(LogLevel.INFO, `Joined a guild: ${guild.name} [ID: ${guild.id}]`);

        if (!client.config.props[guild.id]) {
            await client.debugLogger.logLeaveJoin(LogLevel.CRITICAL, `Unauthorized guild detected: ${guild.name} [ID: ${guild.id}]`);
            await guild.leave();
        }
    }
}