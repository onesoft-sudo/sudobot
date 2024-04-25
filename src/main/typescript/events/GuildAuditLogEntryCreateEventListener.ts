import { Inject } from "@framework/container/Inject";
import EventListener from "@framework/events/EventListener";
import { Events } from "@framework/types/ClientEvents";
import { fetchUser } from "@framework/utils/entities";
import type AuditLoggingService from "@main/services/AuditLoggingService";
import { LogEventType } from "@main/types/LoggingSchema";
import { InfractionDeliveryStatus, InfractionType } from "@prisma/client";
import { AuditLogEvent, Guild, GuildAuditLogsEntry, GuildMember, User } from "discord.js";

class GuildAuditLogEntryCreateEventListener extends EventListener<Events.GuildAuditLogEntryCreate> {
    public override readonly name = Events.GuildAuditLogEntryCreate;

    @Inject("auditLoggingService")
    protected readonly auditLoggingService!: AuditLoggingService;

    public override async execute(auditLogEntry: GuildAuditLogsEntry, guild: Guild): Promise<void> {
        if (
            auditLogEntry.action === AuditLogEvent.MemberBanAdd ||
            auditLogEntry.action === AuditLogEvent.MemberBanRemove
        ) {
            const executor =
                auditLogEntry.executor ?? auditLogEntry.executorId
                    ? await fetchUser(this.client, auditLogEntry.executorId!)
                    : null;

            if (executor && executor.id === this.client.user?.id) {
                return;
            }

            const user =
                auditLogEntry.target instanceof GuildMember
                    ? auditLogEntry.target.user
                    : (auditLogEntry.target as User);

            if (!user) {
                return;
            }

            const infraction = await this.application.prisma.infraction.create({
                data: {
                    guildId: guild.id,
                    moderatorId: executor?.id ?? "0",
                    userId: user.id,
                    type:
                        auditLogEntry.action === AuditLogEvent.MemberBanAdd
                            ? InfractionType.BAN
                            : InfractionType.UNBAN,
                    reason: auditLogEntry.reason ?? undefined,
                    deliveryStatus: InfractionDeliveryStatus.NOT_DELIVERED
                }
            });

            this.auditLoggingService.emitLogEvent(
                guild.id,
                auditLogEntry.action === AuditLogEvent.MemberBanAdd
                    ? LogEventType.MemberBanAdd
                    : LogEventType.MemberBanRemove,
                {
                    guild,
                    moderator: executor ?? undefined,
                    user,
                    reason: auditLogEntry.reason ?? undefined,
                    infractionId: infraction.id
                }
            );
        }
    }
}

export default GuildAuditLogEntryCreateEventListener;
