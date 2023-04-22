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

import { Message } from "discord.js";
import Service from "../utils/structures/Service";
import { hasConfig } from "../utils/util";

export default class AutoResponder extends Service {
    async run(message: Message) {
        if (!hasConfig(this.client, message.guildId!, "autoresponder"))
            return;
        
        const config = this.client.config.props[message.guild!.id]?.autoresponder;

        if (!config?.enabled) {
            return;
        }

        let responseCount = 0;

        for (const token in config.tokens) {
            if (responseCount >= 3) {
                return;
            }

            if (message.content.toLowerCase().includes(token.toLowerCase())) {
                await message.reply({ content: config.tokens[token] });
                responseCount++;
            }
        }

        for (const word in config.words) {
            if (responseCount >= 3) {
                return;
            }
            
            if (this.client.commonService.words.includes(word)) {
                await message.reply({ content: config.words[word] });
                responseCount++;
            }
        }
    }
}