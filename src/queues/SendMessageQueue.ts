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

import Queue from "../utils/structures/Queue";

export default class SendMessageQueue extends Queue {
    async execute(data: { [key: string]: string }): Promise<any> {
        console.log(data);
        const { messageID, channelID, guildID } = data;
        
        console.log("Queue works!");
        console.log("Sending message...");

        const guild = this.client.guilds.cache.get(guildID);

        if (!guild) {
            return;
        }

        const channel = guild.channels.cache.get(channelID);

        if (!channel || channel.type !== 'GUILD_TEXT') {
            return;
        }

        try {
            const message = await channel.messages.fetch(messageID);
            await message?.reply({ content: "Awesome stuff!" });
        }
        catch (e) {
            console.log(e);
        }
    }
}