import { Inject } from "@framework/container/Inject";
import EventListener from "@framework/events/EventListener";
import { Events } from "@framework/types/ClientEvents";
import { fetchUser } from "@framework/utils/entities";
import { LogEventType } from "@main/schemas/LoggingSchema";
import type AuditLoggingService from "@main/services/AuditLoggingService";
import type InfractionManager from "@main/services/InfractionManager";
import { InfractionDeliveryStatus, InfractionType } from "@prisma/client";
import { AuditLogEvent, type GuildMember } from "discord.js";

class GuildMemberRemoveEventListener extends EventListener<Events.GuildMemberRemove> {
    public override readonly name = Events.GuildMemberRemove;

    @Inject("auditLoggingService")
    protected readonly auditLoggingService!: AuditLoggingService;

    @Inject("infractionManager")
    protected readonly infractionManager!: InfractionManager;

    public override execute(member: GuildMember): void {
        setTimeout(async () => {
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
                const infraction = await this.application.prisma.infraction.create({
                    data: {
                        guildId: member.guild.id,
                        userId: member.id,
                        moderatorId: executorId ?? "0",
                        type: InfractionType.KICK,
                        reason: log.reason ?? undefined,
                        deliveryStatus: InfractionDeliveryStatus.NOT_DELIVERED
                    }
                });

                this.auditLoggingService.emitLogEvent(
                    member.guild.id,
                    LogEventType.GuildMemberKick,
                    {
                        member,
                        moderator:
                            log.executor ??
                            (executorId
                                ? (await fetchUser(this.client, executorId)) ?? undefined
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
        }, 2500);
    }
}

export default GuildMemberRemoveEventListener;
