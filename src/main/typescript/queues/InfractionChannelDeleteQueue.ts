import Queue from "@framework/queues/Queue";
import { fetchChannel } from "@framework/utils/entities";
import type { Snowflake } from "discord.js";

type InfractionChannelDeleteQueuePayload = {
    channelId: Snowflake;
    type: "channel" | "thread";
};

class InfractionChannelDeleteQueue extends Queue<InfractionChannelDeleteQueuePayload> {
    public static override readonly uniqueName = "infraction_channel_delete";

    public async execute({ channelId, type }: InfractionChannelDeleteQueuePayload) {
        const guild = this.application.client.guilds.cache.get(this.guildId);

        if (!guild) {
            return;
        }

        const config =
            this.application.getServiceByName("configManager").config[this.guildId]?.infractions;

        if (!config || config.dm_fallback === "none") {
            return;
        }

        if (type === "channel") {
            const channel = await fetchChannel(this.guildId, channelId);

            if (channel && channel.parentId === config.dm_fallback_parent_channel) {
                await channel.delete("Deleting infraction channel after expiration");
            }
        } else {
            const channel = await fetchChannel(this.guildId, channelId);

            if (!channel || !("threads" in channel)) {
                return;
            }

            try {
                const thread = await channel.threads.fetch(channelId);
                thread?.delete("Deleting infraction thread after expiration");
            } catch {
                return;
            }
        }
    }
}

export default InfractionChannelDeleteQueue;
