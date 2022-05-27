import { CommandInteraction, GuildMember, Message, User } from "discord.js";
import CommandOptions from "../types/CommandOptions";

export default async function getMember(msgInteraction: Message, options: CommandOptions, index: number = 0): Promise<GuildMember | null | undefined> {
    if (options.normalArgs[index] === undefined) 
        return null;
    
    console.log('here');
    
    if (msgInteraction.mentions.members?.at(index))
        return await msgInteraction.mentions.members?.at(index);

    console.log(2);
    

    const arg = await options.normalArgs[index];

    if (arg.indexOf('#') !== -1) {
        return await msgInteraction.guild?.members.cache.find(m => m.user.tag === arg);
    }

    return await msgInteraction.guild?.members.fetch(arg);
}