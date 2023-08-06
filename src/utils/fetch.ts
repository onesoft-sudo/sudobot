import { Guild, Snowflake, TextBasedChannel } from "discord.js";
import { logError } from "./logger";

export async function safeMemberFetch(guild: Guild, id: Snowflake) {
    try {
        return guild.members.cache.get(id) ?? (await guild.members.fetch(id));
    } catch (e) {
        logError(e);
        return null;
    }
}

export async function safeChannelFetch(guild: Guild, id: Snowflake) {
    try {
        return guild.channels.cache.get(id) ?? (await guild.channels.fetch(id));
    } catch (e) {
        logError(e);
        return null;
    }
}

export async function safeRoleFetch(guild: Guild, id: Snowflake) {
    try {
        return guild.roles.cache.get(id) ?? (await guild.roles.fetch(id));
    } catch (e) {
        logError(e);
        return null;
    }
}

export async function safeMessageFetch(channel: TextBasedChannel, id: Snowflake) {
    try {
        return channel.messages.cache.get(id) ?? (await channel.messages.fetch(id));
    } catch (e) {
        logError(e);
        return null;
    }
}
