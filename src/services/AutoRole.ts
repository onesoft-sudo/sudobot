
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
import DiscordClient from "../client/Client";

export default async function autoRole(client: DiscordClient, member: GuildMember) {
    const config = client.config.props[member.guild!.id].autorole;

    if (config.enabled) {
        for await (const roleID of config.roles) {
            try {
                const role = await member.guild.roles.fetch(roleID);

                if (role) {
                    await member.roles.add(role);
                }
            }
            catch (e) {
                console.log(e);
            }
        }
    }
};