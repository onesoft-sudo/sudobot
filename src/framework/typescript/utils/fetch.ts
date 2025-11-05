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

import Application from "@framework/app/Application";
import type { Client, Guild, Snowflake, TextBasedChannel } from "discord.js";

export async function safeMemberFetch(guild: Guild, id: Snowflake) {
    try {
        return guild.members.cache.get(id) ?? (await guild.members.fetch(id));
    } catch (e) {
        Application.current().logger.error(e);
        return null;
    }
}

export async function safeUserFetch(client: Client, id: Snowflake) {
    try {
        return client.users.cache.get(id) ?? (await client.users.fetch(id));
    } catch (e) {
        Application.current().logger.error(e);
        return null;
    }
}

export async function safeChannelFetch(guild: Guild, id: Snowflake) {
    try {
        return guild.channels.cache.get(id) ?? (await guild.channels.fetch(id));
    } catch (e) {
        Application.current().logger.error(e);
        return null;
    }
}

export async function safeRoleFetch(guild: Guild, id: Snowflake) {
    try {
        return guild.roles.cache.get(id) ?? (await guild.roles.fetch(id));
    } catch (e) {
        Application.current().logger.error(e);
        return null;
    }
}

export async function safeMessageFetch(channel: TextBasedChannel, id: Snowflake) {
    try {
        return channel.messages.cache.get(id) ?? (await channel.messages.fetch(id));
    } catch (e) {
        Application.current().logger.error(e);
        return null;
    }
}
