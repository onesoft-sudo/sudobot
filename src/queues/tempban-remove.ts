import { User } from "discord.js";
import DiscordClient from "../client/Client";

export default async function tempBanRemove(client: DiscordClient, user_id: string, guild_id: string) {
    const guild = await client.guilds.cache.get(guild_id);

    if (guild) {
        const user = <User> await client.users.fetch(user_id);

        if (user) {
            await guild.bans.remove(user, 'Remove temporary ban');
        }
    }
}