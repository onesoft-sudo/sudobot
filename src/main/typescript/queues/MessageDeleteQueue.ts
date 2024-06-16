import Queue from "@framework/queues/Queue";
import { fetchChannel, fetchMessage } from "@framework/utils/entities";
import type { Snowflake } from "discord.js";

type MessageDeleteQueuePayload = {
    guildId: Snowflake;
    channelId: Snowflake;
    messageId: Snowflake;
};

class MessageDeleteQueue extends Queue<MessageDeleteQueuePayload> {
    public static override readonly uniqueName = "message_delete";

    public async execute({ guildId, channelId, messageId }: MessageDeleteQueuePayload) {
        const guild = this.application.client.guilds.cache.get(guildId);

        if (!guild) {
            return;
        }

        const channel = await fetchChannel(guild, channelId);

        if (!channel?.isTextBased()) {
            return;
        }

        const message = await fetchMessage(channel, messageId);

        if (!message) {
            return;
        }

        await message.delete().catch(console.error);
    }
}

export default MessageDeleteQueue;
