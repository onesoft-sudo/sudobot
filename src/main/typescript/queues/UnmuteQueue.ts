import Queue from "@framework/queues/Queue";
import type { Snowflake } from "discord.js";
import { italic } from "discord.js";
import { safeMemberFetch } from "../utils/fetch";

type UnmuteQueuePayload = {
    memberId: Snowflake;
    guildId: Snowflake;
    infractionId: number;
};

class UnmuteQueue extends Queue<UnmuteQueuePayload> {
    public static override readonly uniqueName = "unmute";

    public async execute({ guildId, memberId }: UnmuteQueuePayload) {
        this.application.logger.debug("Unmuting member");

        const guild = this.application.client.guilds.cache.get(guildId);

        if (!guild) {
            return;
        }

        const member = await safeMemberFetch(guild, memberId);

        if (!member) {
            return;
        }

        const result = await this.application
            .getServiceByName("infractionManager")
            .createUnmute({
                guildId: guild.id,
                moderator: this.application.client.user!,
                reason: italic("Your mute has expired"),
                member
            })
            .catch(console.error);

        if (result?.status === "success") {
            this.application.logger.debug("Member unmuted");
        } else {
            this.application.logger.debug("Failed to unmute member");
        }
    }
}

export default UnmuteQueue;
