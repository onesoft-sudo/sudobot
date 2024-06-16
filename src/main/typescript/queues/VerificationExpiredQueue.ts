import Queue from "@framework/queues/Queue";
import type { Snowflake } from "discord.js";

type VerificationExpiredQueuePayload = {
    memberId: Snowflake;
    guildId: Snowflake;
};

class VerificationExpiredQueue extends Queue<VerificationExpiredQueuePayload> {
    public static override readonly uniqueName = "verification_expired";

    public async execute({ guildId, memberId }: VerificationExpiredQueuePayload) {
        const guild = this.application.client.guilds.cache.get(guildId);

        if (!guild) {
            return;
        }

        const config =
            this.application.service("configManager").config[guildId]?.member_verification;

        if (!config?.enabled) {
            return;
        }

        await this.application
            .service("verificationService")
            .onVerificationExpire(guildId, memberId);
    }
}

export default VerificationExpiredQueue;
