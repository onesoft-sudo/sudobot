import DiscordClient from '../client/Client';
import { User, GuildMember, GuildChannel, Role, Guild } from 'discord.js';

export async function parseUser(client: DiscordClient, input: string): Promise <User | null> {
	if (!/^\<\@(\d+)\>$/.test(input.trim())) {
		return null;
	}	

	let user: User | null = null;	

	try {
		user = await client.users.fetch(input.trim().substring(2, input.trim().length - 1));
	}
	catch (e) {
		return null;
	}

	return user;
}

export async function parseMember(guild: Guild, input: string): Promise <GuildMember | null> {
	if (!/^\<\@(\d+)\>$/.test(input.trim())) {
		return null;
	}	

	let user: GuildMember | null = null;	

	try {
		user = await guild.members.fetch(input.trim().substring(2, input.trim().length - 1));
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
		channel = await guild.channels.fetch(input.trim().substring(2, input.trim().length - 1));
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
