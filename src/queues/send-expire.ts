import { TextChannel } from "discord.js";
import DiscordClient from "../client/Client";
import { setTimeoutv2 } from "../utils/setTimeout";

export default async function send(client: DiscordClient, content: string, channel_id: string, guild_id: string, expire_at: string) {
    console.log(channel_id, guild_id);
    const guild = await client.guilds.cache.get(guild_id);

    if (guild) {
        const channel = await guild.channels.fetch(channel_id);

        if (channel) {
            const message = await (channel as TextChannel).send({
                content
            });

            await setTimeoutv2('expire.ts', parseInt(expire_at), guild_id, `expire ${expire_at} ${content} #${channel.name}`, message.id, channel.id, guild.id);
        }
    }
}