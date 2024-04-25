import { Inject } from "@framework/container/Inject";
import EventListener from "@framework/events/EventListener";
import { Events } from "@framework/types/ClientEvents";
import type AuditLoggingService from "@main/services/AuditLoggingService";
import { LogEventType } from "@main/types/LoggingSchema";
import type { GuildMember } from "discord.js";

class GuildMemberRemoveEventListener extends EventListener<Events.GuildMemberRemove> {
    public override readonly name = Events.GuildMemberRemove;

    @Inject("auditLoggingService")
    protected readonly auditLoggingService!: AuditLoggingService;

    public override async execute(member: GuildMember): Promise<void> {
        this.auditLoggingService.emitLogEvent(
            member.guild.id,
            LogEventType.GuildMemberRemove,
            member
        );
    }
}

export default GuildMemberRemoveEventListener;
