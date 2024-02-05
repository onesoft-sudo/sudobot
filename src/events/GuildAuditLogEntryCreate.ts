import { InfractionType } from "@prisma/client";
import {
    AuditLogEvent,
    Guild,
    GuildAuditLogsActionType,
    GuildAuditLogsEntry,
    GuildAuditLogsTargetType,
    GuildMember,
    User
} from "discord.js";
import EventListener from "../core/EventListener";
import { safeUserFetch } from "../utils/fetch";

export default class GuildAuditLogEntryCreateEventListener extends EventListener<"guildAuditLogEntryCreate"> {
    public readonly name = "guildAuditLogEntryCreate";

    async execute(
        auditLogEntry: GuildAuditLogsEntry<AuditLogEvent, GuildAuditLogsActionType, GuildAuditLogsTargetType, AuditLogEvent>,
        guild: Guild
    ): Promise<void> {
        console.log(
            auditLogEntry.action,
            auditLogEntry.executor?.toString(),
            auditLogEntry.target?.toString(),
            auditLogEntry.extra
        );

        if (auditLogEntry.action === AuditLogEvent.MemberBanAdd) {
            const { executorId, executor, targetId, reason, target } = auditLogEntry;
            const user =
                target instanceof User
                    ? target
                    : target instanceof GuildMember
                    ? target.user
                    : targetId
                    ? await safeUserFetch(this.client, targetId)
                    : null;

            if (user && executorId && executorId !== this.client.user?.id) {
                const infraction = await this.client.prisma.infraction.create({
                    data: {
                        guildId: guild.id,
                        moderatorId: executorId,
                        type: InfractionType.BAN,
                        userId: user.id,
                        reason: reason ?? undefined
                    }
                });

                await this.client.logger.logUserBan({
                    moderator:
                        executor ??
                        (await safeUserFetch(this.client, executorId)) ??
                        ({ ...this.client.user!, username: "Unknown", id: executorId } as unknown as User),
                    user,
                    guild,
                    id: infraction.id.toString(),
                    includeDeleteMessageSeconds: false,
                    reason: reason ?? undefined
                });
            }
        } else if (auditLogEntry.action === AuditLogEvent.MemberKick) {
            const { executorId, executor, targetId, reason, target } = auditLogEntry;
            console.log("target instanceof GuildMember", target instanceof GuildMember);
            const user =
                target instanceof User
                    ? target
                    : target instanceof GuildMember
                    ? target.user
                    : targetId
                    ? await safeUserFetch(this.client, targetId)
                    : null;

            if (user && executorId && executorId !== this.client.user?.id) {
                const infraction = await this.client.prisma.infraction.create({
                    data: {
                        guildId: guild.id,
                        moderatorId: executorId,
                        type: InfractionType.KICK,
                        userId: user.id,
                        reason: reason ?? undefined
                    }
                });

                await this.client.logger.logMemberKick({
                    moderator:
                        executor ??
                        (await safeUserFetch(this.client, executorId)) ??
                        ({ ...this.client.user!, username: "Unknown", id: executorId } as unknown as User),
                    user,
                    guild,
                    id: infraction.id.toString(),
                    reason: reason ?? undefined
                });
            }
        }
    }
}
