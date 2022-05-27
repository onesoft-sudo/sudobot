import { TextChannel } from "discord.js";
import DiscordClient from "../client/Client";

export default async function expire(client: DiscordClient, message_id: string, channel_id: string, guild_id: string) {
    console.log(channel_id, guild_id);
    const guild = await client.guilds.cache.get(guild_id);

    if (guild) {
        const channel = await guild.channels.fetch(channel_id);

        if (channel) {
            const message = await (channel as TextChannel).messages.fetch(message_id);

            if (message) {
                await message.delete();
            }
        }
    }
}