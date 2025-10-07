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

import type BaseClient from "@framework/client/BaseClient";
import type { Client, Guild, Snowflake, TextBasedChannel } from "discord.js";
import { client } from "./helpers";

export async function fetchChannel(guildOrId: Guild | Snowflake, channelId: Snowflake) {
    const guild = typeof guildOrId === "string" ? client().guilds.cache.get(guildOrId) : guildOrId;

    if (!guild) {
        return null;
    }

    try {
        return guild.channels.cache.get(channelId) ?? (await guild.channels.fetch(channelId));
    } catch {
        return null;
    }
}

export async function fetchRole(guild: Guild, roleId: Snowflake) {
    try {
        return guild.roles.cache.get(roleId) ?? (await guild.roles.fetch(roleId));
    } catch {
        return null;
    }
}

export async function fetchMember(guild: Guild, memberId: Snowflake) {
    try {
        return guild.members.cache.get(memberId) ?? (await guild.members.fetch(memberId));
    } catch {
        return null;
    }
}

export async function fetchUser(client: BaseClient, userId: Snowflake) {
    try {
        return client.users.cache.get(userId) ?? (await client.users.fetch(userId));
    } catch {
        return null;
    }
}

export async function fetchMessage(channel: TextBasedChannel, messageId: Snowflake) {
    try {
        return channel.messages.cache.get(messageId) ?? (await channel.messages.fetch(messageId));
    } catch {
        return null;
    }
}

export async function fetchGuild(client: Client<boolean>, guildId: Snowflake) {
    try {
        return client.guilds.cache.get(guildId) ?? (await client.guilds.fetch(guildId));
    } catch {
        return null;
    }
}
