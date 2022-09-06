import { Message, User } from "discord.js";
import DiscordClient from "../client/Client";
import CommandOptions from "../types/CommandOptions";
import { parseUser } from './parseInput';

export default async function getUser(client: DiscordClient, msgInteraction: Message, options: CommandOptions, index: number = 0): Promise<User | null | undefined> {
    if (options.normalArgs[index] === undefined) 
        return null;
    
    const arg = await options.normalArgs[index];

	console.log(arg);

    if (arg.indexOf('#') !== -1) {
        return await client.users.cache.find(user => user.tag === arg);
    }

    const parsed = await parseUser(client, arg);

    if (parsed) {
    	return parsed;
    }

	try {
    	const u = await client.users.fetch(arg);
    	return u;
    }
    catch (e) {
    	console.log(e);
    	return null;
    }
}
