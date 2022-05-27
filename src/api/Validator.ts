import { Guild, GuildChannel, GuildMember, Role, TextChannel, User } from "discord.js";
import DiscordClient from "../client/Client";

export async function isChannel(id: string | number, guild: string): Promise <boolean> {
    try {
        const channel = <GuildChannel> await (<Guild> await DiscordClient.client.guilds.fetch(guild)).channels.fetch(id.toString());

        if (!channel || (channel.type !== 'GUILD_TEXT' && channel.type !== 'GUILD_NEWS' && channel.type !== 'GUILD_CATEGORY'))
            return false;
    }
    catch (e) {
        return false;
    }

    return true;
}

export async function isRole(id: string | number, guild: string): Promise <boolean> {
    try {
        const role = <Role> await (<Guild> await DiscordClient.client.guilds.fetch(guild)).roles.fetch(id.toString());
        

        if (!role)
            return false;
    }
    catch (e) {
        return false;
    }

    return true;
}

export async function isMember(id: string | number, guild: string): Promise <boolean> {
    try {
        const member = <GuildMember> await (<Guild> await DiscordClient.client.guilds.fetch(guild)).members.fetch(id.toString());

        if (!member)
            return false;
    }
    catch (e) {
        return false;
    }

    return true;
}

export async function isUser(id: string | number): Promise <boolean> {
    try {
        const user = <User> await DiscordClient.client.users.fetch(id.toString());

        if (!user)
            return false;
    }
    catch (e) {
        return false;
    }

    return true;
}