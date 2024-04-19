import Queue from "@framework/queues/Queue";
import type { Snowflake } from "discord.js";
import { italic } from "discord.js";
import { safeMemberFetch } from "../utils/fetch";

type UnmuteQueuePayload = {
    memberId: Snowflake;
    guildId: Snowflake;
};

class UnmuteQueue extends Queue<UnmuteQueuePayload> {
    public static override readonly uniqueName = "unmute";

    public async execute({ guildId, memberId }: UnmuteQueuePayload) {
        const guild = this.application.client.guilds.cache.get(guildId);

        if (!guild) {
            return;
        }

        const member = await safeMemberFetch(guild, memberId);

        if (!member) {
            return;
        }

        await this.application
            .getServiceByName("infractionManager")
            .createUnmute({
                guildId: guild.id,
                moderator: this.application.client.user!,
                reason: italic("Your mute has expired"),
                member
            })
            .catch(console.error);
    }
}

export default UnmuteQueue;
