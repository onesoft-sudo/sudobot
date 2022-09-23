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

import { exit } from "process";
import DiscordClient from "../../client/Client";
import BaseCLICommand from "../../utils/structures/BaseCLICommand";

export default class GuildLeaveCommand extends BaseCLICommand {
    requiredArgs = 1;

    constructor() {
        super('guildleave', 'guild');
    }

    async run(client: DiscordClient, argv: string[], args: string[]) {
        const guild_id = args.shift()!;
        let reason: string | null = null;

        if (args.length > 0)
            reason = args.join(' ');

        const guild = await client.guilds.cache.get(guild_id);

        if (!guild) {
            console.error("Failed to find a guild with ID " + guild_id);
            exit(-1);
        }
        
        await guild.leave();

        console.log(`Succesfully left guild: ${guild.name} (${guild.id})`);
        
        await exit(0);
    }
}