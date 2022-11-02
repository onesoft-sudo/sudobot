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

import { Emoji } from "discord.js";
import DiscordClient from "../client/Client";

function globalConfig() {
    return DiscordClient.client.config.props.global;
}

export function fetchEmoji(name: string) {    
    return findEmoji(e => e.name === name);
}

export function fetchEmojiStr(name: string) {    
    return (findEmoji(e => e.name === name))?.toString();
}

export function emoji(name: string) {
    return findEmoji(e => e.name === name)?.toString();
}

export function findEmoji(callback: (e: Emoji) => boolean) {
    return DiscordClient.client.guilds.cache.find(g => g.id === globalConfig().id)!.emojis.cache.find(callback);
}