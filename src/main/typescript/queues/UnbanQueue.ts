import Queue from "@framework/queues/Queue";
import { Snowflake } from "discord.js";
import { safeUserFetch } from "../utils/fetch";

type UnbanQueuePayload = {
    userId: Snowflake;
    guildId: Snowflake;
};

class UnbanQueue extends Queue<UnbanQueuePayload> {
    public static override readonly uniqueName = "unban";

    public async execute({ guildId, userId }: UnbanQueuePayload) {
        const guild = this.application.client.guilds.cache.get(guildId);

        if (!guild) {
            return;
        }

        const user = await safeUserFetch(this.application.client, userId);

        if (!user) {
            return;
        }

        await this.application
            .getServiceByName("infractionManager")
            .createUnban({
                guildId: guild.id,
                moderator: this.application.client.user!,
                reason: "Automatic unban after temporary ban expiration",
                user
            })
            .catch(console.error);
    }
}

export default UnbanQueue;
