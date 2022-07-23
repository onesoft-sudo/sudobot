import { CommandInteraction, GuildMember, Message, User } from "discord.js";
import CommandOptions from "../types/CommandOptions";
import { parseMember } from './parseInput';

export default async function getMember(msgInteraction: Message, options: CommandOptions, index: number = 0): Promise<GuildMember | null | undefined> {
    if (options.normalArgs[index] === undefined) 
        return null;
    
    const arg = await options.normalArgs[index];

    if (arg.indexOf('#') !== -1) {
        return await msgInteraction.guild?.members.cache.find(m => m.user.tag === arg);
    }

	const parsed = await parseMember(msgInteraction.guild!, arg);

	if (parsed) {
		return parsed;
	}
    
	try {
    	return await msgInteraction.guild?.members.fetch(arg);
    }
    catch (e) {
    	console.log(e);
    	return null;
    }
}
