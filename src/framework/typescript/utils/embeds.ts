/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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

import type { Client, Snowflake } from "discord.js";
import { type GuildBasedChannel, type Message, MessageType, type User } from "discord.js";

export function userInfo(user: User) {
    return `ID: ${user.id}\nUsername: ${user.username}\nMention: <@${user.id}>`;
}

export function channelInfo(channel: GuildBasedChannel) {
    return `ID: ${channel.id}\nName: ${channel.name}\nMention: <#${channel.id}>`;
}

export function messageInfo(message: Message) {
    return `ID: ${message.id}\nType: ${MessageType[message.type]}\nURL: ${message.url}`;
}

export function shortUserInfo(client: Client, userId: Snowflake) {
    if (userId === client.user!.id) {
        return "System";
    }

    return `<@${userId}> [\`${userId}\`]`;
}
