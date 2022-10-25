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
import BaseCommand from "../utils/structures/BaseCommand";
import Service from "../utils/structures/Service";

export default class Auth extends Service {
    async verify(member: GuildMember, command: BaseCommand): Promise<boolean> {
        if (this.client.config.props.global.owners.includes(member.user.id)) {
            return true;
        }
        
        if (command.ownerOnly && !this.client.config.props.global.owners.includes(member.user.id)) {
            return false;
        }

        const cmds: string[] = await this.client.config.get('global_commands');

        if (cmds.indexOf(command.getName()) !== -1) {
            return true;
        }

        if (await member.roles.cache.has(await this.client.config.get('mod_role'))) {
            let restricted: string[] = [];
            const roleCommands: { [key: string]: string[] } = await this.client.config.get('role_commands');
            
            for (const roleID in roleCommands) {
                if (await member.roles.cache.has(roleID)) {
                    restricted = await roleCommands[roleID];
                    break;
                }
            }

            return restricted.indexOf(command.getName()) === -1;
        }

        return false;
    }
};