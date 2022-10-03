import { Message } from "discord.js";
import Queue from "../utils/structures/Queue";

export default class SendMessageQueue extends Queue {
    async execute(data: { [key: string]: string }): Promise<any> {
        console.log(data);
        const { messageID, channelID, guildID } = data;
        
        console.log("Queue works!");
        console.log("Sending message...");

        const guild = this.client.guilds.cache.get(guildID);

        if (!guild) {
            return;
        }

        const channel = guild.channels.cache.get(channelID);

        if (!channel || channel.type !== 'GUILD_TEXT') {
            return;
        }

        try {
            const message = await channel.messages.fetch(messageID);
            await message?.reply({ content: "Awesome stuff!" });
        }
        catch (e) {
            console.log(e);
        }
    }
}