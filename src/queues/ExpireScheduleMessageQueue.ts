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
import Queue from "../utils/structures/Queue";
import ExpireMessageQueue from "./ExpireMessageQueue";

export default class ExpireScheduleMessageQueue extends Queue {
    async execute({ channelID, guildID, content, expires }: { [key: string]: string }): Promise<any> {
        const guild = this.client.guilds.cache.get(guildID);

        if (!guild) {
            return;
        }

        const channel = guild.channels.cache.get(channelID) as TextChannel;

        if (!channel || !['GUILD_TEXT', 'GUILD_NEWS', 'GUILD_NEWS_THREAD', 'GUILD_PUBLIC_THREAD', 'GUILD_PRIVATE_THREAD'].includes(channel.type)) {
            return;
        }

        try {
            const { id: messageID } =  await channel.send({ content });

            await this.client.queueManager.addQueue(ExpireMessageQueue, {
                data: {
                    messageID,
                    guildID,
                    channelID,
                },
                runAt: new Date(Date.now() + expires)
            });
        }
        catch (e) {
            console.log(e);
        }
    }
}