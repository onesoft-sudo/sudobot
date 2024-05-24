import Queue from "@framework/queues/Queue";
import { LogEventType } from "@main/schemas/LoggingSchema";
import { InfractionType, type PrismaClient } from "@prisma/client";
import type { Snowflake } from "discord.js";

type MassUnbanQueuePayload = {
    userIds: Snowflake[];
    guildId: Snowflake;
};

// TODO: Logging
class MassUnbanQueue extends Queue<MassUnbanQueuePayload> {
    public static override readonly uniqueName = "mass_unban";

    public async execute({ guildId, userIds }: MassUnbanQueuePayload) {
        const guild = this.application.client.guilds.cache.get(guildId);

        if (!guild) {
            return;
        }

        const infractionCreatePayload: Parameters<
            PrismaClient["infraction"]["create"]
        >[0]["data"][] = [];
        const reason = "Automatic unban after temporary mass-ban expiration";

        for (const id of userIds) {
            try {
                await guild.bans.remove(id, reason);

                infractionCreatePayload.push({
                    guildId: guild.id,
                    moderatorId: this.application.client.user!.id,
                    reason,
                    userId: id,
                    type: InfractionType.UNBAN
                });
            } catch (error) {
                this.application.logger.error(error);
            }
        }

        if (infractionCreatePayload.length > 0) {
            await this.application.prisma.infraction
                .createMany({
                    data: infractionCreatePayload
                })
                .then()
                .catch(console.error);
        }

        this.application
            .service("auditLoggingService")
            .emitLogEvent(guildId, LogEventType.MemberMassUnban, {
                guild,
                moderator: this.application.client.user!,
                reason,
                users: userIds
            })
            .catch(this.application.logger.error);
    }
}

export default MassUnbanQueue;
