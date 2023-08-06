import { Guild, Snowflake } from "discord.js";
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
