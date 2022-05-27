import { CommandInteraction, GuildMember, Message, User } from "discord.js";
import DiscordClient from "../client/Client";
import CommandOptions from "../types/CommandOptions";
import InteractionOptions from "../types/InteractionOptions";

export default async function getUser(client: DiscordClient, msgInteraction: Message, options: CommandOptions, index: number = 0): Promise<User | null | undefined> {
    if (options.normalArgs[index] === undefined) 
        return null;
    
    console.log('here');
    
    if (msgInteraction.mentions.users?.at(index))
        return await msgInteraction.mentions.users?.at(index);

    console.log(2);
    
    const arg = await options.normalArgs[index];

    if (arg.indexOf('#') !== -1) {
        return await client.users.cache.find(user => user.tag === arg);
    }

    return await client.users.fetch(arg);
}