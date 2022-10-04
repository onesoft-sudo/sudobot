import { TextChannel } from "discord.js";
import Queue from "../utils/structures/Queue";

export default class ExpireMessageQueue extends Queue {
    async execute({ messageID, channelID, guildID }: { [key: string]: string }): Promise<any> {
        const guild = this.client.guilds.cache.get(guildID);

        if (!guild) {
            return;
        }

        const channel = guild.channels.cache.get(channelID) as TextChannel;

        if (!channel || !['GUILD_TEXT', 'GUILD_NEWS', 'GUILD_NEWS_THREAD', 'GUILD_PUBLIC_THREAD', 'GUILD_PRIVATE_THREAD'].includes(channel.type)) {
            return;
        }

        try {
            const message = await channel.messages.fetch(messageID);
            await message?.delete();
        }
        catch (e) {
            console.log(e);
        }
    }
}