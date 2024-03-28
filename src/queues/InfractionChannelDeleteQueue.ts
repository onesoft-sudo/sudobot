import { Snowflake } from "discord.js";
import Queue from "../framework/queues/Queue";
import { fetchChannel } from "../framework/utils/entities";

type InfractionChannelDeleteQueuePayload = {
    channelId: Snowflake;
};

class InfractionChannelDeleteQueue extends Queue<InfractionChannelDeleteQueuePayload> {
    public static override readonly uniqueName = "infraction_channel_delete";

    public async execute() {
        const guild = this.application.client.guilds.cache.get(this.guildId);

        if (!guild) {
            return;
        }

        const config =
            this.application.getServiceByName("configManager").config[this.guildId]?.infractions;

        if (!config || config.dm_fallback !== "create_channel") {
            return;
        }

        const channel = await fetchChannel(this.guildId, this.data.channelId);

        if (channel && channel.parentId === config.dm_fallback_parent_channel) {
            await channel.delete("Deleting infraction channel after expiration");
        }
    }
}

export default InfractionChannelDeleteQueue;
