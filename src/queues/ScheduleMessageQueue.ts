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
import { fetchEmoji } from "../utils/Emoji";
import Queue from "../utils/structures/Queue";

export default class ScheduleMessageQueue extends Queue {
    async execute({ channelID, guildID, content }: { [key: string]: string }): Promise<any> {
        const guild = this.client.guilds.cache.get(guildID);

        if (!guild) {
            return;
        }

        const channel = guild.channels.cache.get(channelID) as TextChannel;

        if (!channel || !['GUILD_TEXT', 'GUILD_NEWS', 'GUILD_NEWS_THREAD', 'GUILD_PUBLIC_THREAD', 'GUILD_PRIVATE_THREAD'].includes(channel.type)) {
            return;
        }

        try {
            await channel.send({ content });
        }
        catch (e) {
            console.log(e);
        }
    }
}