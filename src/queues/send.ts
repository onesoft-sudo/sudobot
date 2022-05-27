import { TextChannel } from "discord.js";
import DiscordClient from "../client/Client";

export default async function send(client: DiscordClient, content: string, channel_id: string, guild_id: string) {
    console.log(channel_id, guild_id);
    const guild = await client.guilds.cache.get(guild_id);

    if (guild) {
        const channel = <TextChannel> await guild.channels.fetch(channel_id);

        if (channel) {
            await channel.send({
                content
            });
        }
    }
}