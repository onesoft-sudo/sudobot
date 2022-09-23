
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

import { Message, User } from "discord.js";
import DiscordClient from "../client/Client";
import CommandOptions from "../types/CommandOptions";
import { parseUser } from './parseInput';

export default async function getUser(client: DiscordClient, msgInteraction: Message, options: CommandOptions, index: number = 0): Promise<User | null | undefined> {
    if (options.normalArgs[index] === undefined) 
        return null;
    
    const arg = await options.normalArgs[index];

	console.log(arg);

    if (arg.indexOf('#') !== -1) {
        return await client.users.cache.find(user => user.tag === arg);
    }

    const parsed = await parseUser(client, arg);

    if (parsed) {
    	return parsed;
    }

	try {
    	const u = await client.users.fetch(arg);
    	return u;
    }
    catch (e) {
    	console.log(e);
    	return null;
    }
}
