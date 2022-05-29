import { CommandInteraction, GuildMember, Message, Role, User } from "discord.js";
import CommandOptions from "../types/CommandOptions";

export default async function getRole(msgInteraction: Message, options: CommandOptions, index: number = 0): Promise<Role | null | undefined> {
    if (options.normalArgs[index] === undefined) 
        return null;
    
    if (msgInteraction.mentions.roles?.at(index))
        return await msgInteraction.mentions.roles?.at(index);
    
    const arg = await options.normalArgs[index];

    return await msgInteraction.guild?.roles.fetch(arg);
}