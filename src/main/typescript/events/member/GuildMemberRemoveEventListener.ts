import { Inject } from "@framework/container/Inject";
import EventListener from "@framework/events/EventListener";
import { Events } from "@framework/types/ClientEvents";
import { fetchUser } from "@framework/utils/entities";
import { InfractionDeliveryStatus, infractions, InfractionType } from "@main/models/Infraction";
import { LogEventType } from "@main/schemas/LoggingSchema";
import type AuditLoggingService from "@main/services/AuditLoggingService";
import type InfractionManager from "@main/services/InfractionManager";
import { AuditLogEvent, type GuildMember } from "discord.js";

class GuildMemberRemoveEventListener extends EventListener<Events.GuildMemberRemove> {
    public override readonly name = Events.GuildMemberRemove;

    @Inject("auditLoggingService")
    protected readonly auditLoggingService!: AuditLoggingService;

    @Inject("infractionManager")
    protected readonly infractionManager!: InfractionManager;

    public override execute(member: GuildMember): void {
        if (member.id === this.application.client.user?.id) {
            return;
        }

        setTimeout(async () => {
            try {
                const logs = await member.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberKick,
                    limit: 10
                });

                const log = logs.entries.find(
                    entry =>
                        (entry.target?.id ?? entry.targetId) === member.id &&
                        Date.now() - entry.createdTimestamp < 3000
                );

                const executorId = log?.executor?.id ?? log?.executorId;

                if (log && (!executorId || executorId !== this.client.user?.id)) {
                    const [infraction] = await this.application.database.drizzle
                        .insert(infractions)
                        .values({
                            guildId: member.guild.id,
                            userId: member.id,
                            moderatorId: executorId ?? "0",
                            type: InfractionType.Kick,
                            reason: log.reason ?? undefined,
                            deliveryStatus: InfractionDeliveryStatus.NotDelivered
                        })
                        .returning({ id: infractions.id });

                    this.auditLoggingService.emitLogEvent(
                        member.guild.id,
                        LogEventType.GuildMemberKick,
                        {
                            member,
                            moderator:
                                log.executor ??
                                (executorId
                                    ? ((await fetchUser(this.client, executorId)) ?? undefined)
                                    : undefined),
                            reason: log.reason ?? undefined,
                            infractionId: infraction.id
                        }
                    );
                }

                this.auditLoggingService.emitLogEvent(
                    member.guild.id,
                    LogEventType.GuildMemberRemove,
                    member
                );
            } catch (error) {
                this.application.logger.error(
                    "An error occurred while processing the GuildMemberRemove event",
                    error
                );
            }
        }, 2500);
    }
}

export default GuildMemberRemoveEventListener;
