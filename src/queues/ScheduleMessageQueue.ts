import { TextChannel } from "discord.js";
import { fetchEmoji } from "../utils/Emoji";
import Queue from "../utils/structures/Queue";

export default class ScheduleMessageQueue extends Queue {
    async execute({ channelID, guildID, content }: { [key: string]: string }): Promise<any> {
        const guild = this.client.guilds.cache.get(guildID);

        if (!guild) {
            return;
        }

        const channel = guild.channels.cache.get(channelID) as TextChannel;

        if (!channel || !['GUILD_TEXT', 'GUILD_NEWS', 'GUILD_NEWS_THREAD', 'GUILD_PUBLIC_THREAD', 'GUILD_PRIVATE_THREAD'].includes(channel.type)) {
            return;
        }

        try {
            await channel.send({ content });
        }
        catch (e) {
            console.log(e);
        }
    }
}