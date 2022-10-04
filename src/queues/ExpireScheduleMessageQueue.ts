import { TextChannel } from "discord.js";
import { fetchEmoji } from "../utils/Emoji";
import Queue from "../utils/structures/Queue";
import ExpireMessageQueue from "./ExpireMessageQueue";

export default class ExpireScheduleMessageQueue extends Queue {
    async execute({ channelID, guildID, content, expires }: { [key: string]: string }): Promise<any> {
        const guild = this.client.guilds.cache.get(guildID);

        if (!guild) {
            return;
        }

        const channel = guild.channels.cache.get(channelID) as TextChannel;

        if (!channel || !['GUILD_TEXT', 'GUILD_NEWS', 'GUILD_NEWS_THREAD', 'GUILD_PUBLIC_THREAD', 'GUILD_PRIVATE_THREAD'].includes(channel.type)) {
            return;
        }

        try {
            const { id: messageID } =  await channel.send({ content });

            await this.client.queueManager.addQueue(ExpireMessageQueue, {
                data: {
                    messageID,
                    guildID,
                    channelID,
                },
                runAt: new Date(Date.now() + expires)
            });
        }
        catch (e) {
            console.log(e);
        }
    }
}