
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

import { TextChannel } from "discord.js";
import DiscordClient from "../client/Client";
import { setTimeoutv2 } from "../utils/setTimeout";

export default async function send(client: DiscordClient, content: string, channel_id: string, guild_id: string, expire_at: string) {
    console.log(channel_id, guild_id);
    const guild = await client.guilds.cache.get(guild_id);

    if (guild) {
        const channel = await guild.channels.fetch(channel_id);

        if (channel) {
            const message = await (channel as TextChannel).send({
                content
            });

            await setTimeoutv2('expire.ts', parseInt(expire_at), guild_id, `expire ${expire_at} ${content} #${channel.name}`, message.id, channel.id, guild.id);
        }
    }
}