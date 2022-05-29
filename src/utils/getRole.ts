import { CommandInteraction, Guild, GuildMember, Message, Role, User, MessageMentions } from "discord.js";
import CommandOptions from "../types/CommandOptions";

export default async function getRole(msgInteraction: Message, options: CommandOptions, index: number = 0): Promise<Role | null | undefined> {
    if (options.normalArgs[index] === undefined) 
        return null;
    
    if (msgInteraction.mentions.roles?.at(index))
        return await msgInteraction.mentions.roles?.at(index);
    
    const arg = await options.normalArgs[index];

    return await msgInteraction.guild?.roles.fetch(arg);
}

export async function getRoleRaw(roleString: string, guild: Guild): Promise<Role | null | undefined> {
    if (roleString === '@everyone')
        return guild.roles.everyone;
    else if (MessageMentions.ROLES_PATTERN.test(roleString)) {
        roleString = roleString.substring(3, roleString.length - 1);
    }
    
    console.log(roleString);        
    return await guild.roles.fetch(roleString);
}