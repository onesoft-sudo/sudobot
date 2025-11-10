/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025 OSN Developers.
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

import { type APIGuildMember, type APIMessage, type APIUser, Client, GuildMember, Message } from "discord.js";

export const createClient = () => new Client({ intents: [] });

export const randomSnowflake = () =>
    `${Math.round(Math.random() * 50000000000)}${Math.round(Math.random() * 50000000)}`;

export const createMessage = (client: Client) =>
    new (Message as new (client: Client, data: APIMessage) => Message)(client, {
        id: randomSnowflake(),
        author: {
            id: randomSnowflake(),
            username: "random"
        },
        channel_id: randomSnowflake()
    } as APIMessage);

export const createMember = (client: Client, id: string = randomSnowflake()) =>
    new (GuildMember as new (client: Client, data: APIGuildMember) => GuildMember)(client, {
        user: {
            id
        } as APIUser
    } as APIGuildMember);
