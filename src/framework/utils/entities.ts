import { Snowflake } from "discord.js";
import { client } from "./helpers";

export async function fetchChannel(guildId: Snowflake, channelId: Snowflake) {
    const guild = client().guilds.cache.get(guildId);

    if (!guild) {
        return null;
    }

    try {
        return guild.channels.cache.get(channelId) ?? (await guild.channels.fetch(channelId));
    } catch {
        return null;
    }
}
