
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

import DiscordClient from '../client/Client';
import { User, GuildMember, GuildChannel, Role, Guild } from 'discord.js';

export async function parseUser(client: DiscordClient, input: string): Promise <User | null> {
	if (!/^\<\@(\!)?(\d+)\>$/.test(input.trim())) {
		return null;
	}	

	let user: User | null = null;	

	try {
		user = await client.users.fetch(input.trim().substring(input.includes('!') ? 3 : 2, input.trim().length - 1));
	}
	catch (e) {
		return null;
	}

	return user;
}

export async function parseMember(guild: Guild, input: string): Promise <GuildMember | null> {
	if (!/^\<\@(\!)?(\d+)\>$/.test(input.trim())) {
		return null;
	}	

	let user: GuildMember | null = null;	

	try {
		user = await guild.members.fetch(input.trim().substring(input.includes('!') ? 3 : 2, input.trim().length - 1));
	}
	catch (e) {
		return null;
	}

	return user;
}

export async function parseChannel(guild: Guild, input: string): Promise <GuildChannel | null> {
	if (!/^\<\#(\d+)\>$/.test(input.trim())) {
		return null;
	}	

	let channel: GuildChannel | null = null;	

	try {
		channel = <GuildChannel | null> await guild.channels.fetch(input.trim().substring(2, input.trim().length - 1));
	}
	catch (e) {
		return null;
	}

	return channel;
}

export async function parseRole(guild: Guild, input: string): Promise <Role | null> {
	if (!/^\<\@\&(\d+)\>$/.test(input.trim())) {
		return null;
	}	

	let role: Role | null = null;	

	try {
		role = await guild.roles.fetch(input.trim().substring(3, input.trim().length - 1));
	}
	catch (e) {
		return null;
	}

	return role;
}
