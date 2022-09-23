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

import { Guild, Message, Role, MessageMentions } from "discord.js";
import CommandOptions from "../types/CommandOptions";

export default async function getRole(msgInteraction: Message, options: CommandOptions, index: number = 0): Promise<Role | null | undefined> {
    if (options.normalArgs[index] === undefined) 
        return null;
    
    if (msgInteraction.mentions.roles?.at(index))
        return await msgInteraction.mentions.roles?.at(index);
    
    const arg = await options.normalArgs[index];

    return await msgInteraction.guild?.roles.fetch(arg);
}

export async function getRoleRaw(roleString: string, guild: Guild): Promise<Role | null | undefined> {
    if (roleString === '@everyone')
        return guild.roles.everyone;
    else if (MessageMentions.ROLES_PATTERN.test(roleString)) {
        roleString = roleString.substring(3, roleString.length - 1);
    }
    
    console.log(roleString);        
    return await guild.roles.fetch(roleString);
}