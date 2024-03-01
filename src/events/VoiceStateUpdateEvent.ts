import EventListener from "../core/EventListener";
import { Events } from "../types/ClientEvents";
import { AuditLogEvent, VoiceChannel, VoiceState } from "discord.js";

export default class VoiceStateUpdateEventListener extends EventListener<Events.VoiceStateUpdate> {
    public readonly name = Events.VoiceStateUpdate;

    async execute(oldState: VoiceState, newState: VoiceState) {
        setTimeout(async () => {
            const auditLogEntries = await newState.guild.fetchAuditLogs({
                type: AuditLogEvent.MemberDisconnect,
                limit: 1
            });

            const auditLogEntry = auditLogEntries.entries.find(e => {
                console.log(e.createdAt, Date.now());
                return e.createdAt.getTime() > Date.now() - 5_000;
            });

            if (auditLogEntry && oldState.channel) {
                await this.client.loggerService.logMemberDisconnect({
                    user: newState.member?.user ?? oldState.member!.user,
                    moderator: auditLogEntry.executor!,
                    guild: newState.guild,
                    channel: oldState.channel as VoiceChannel
                });

                return;
            }

            await this.client.loggerService.logVoiceStateUpdate(oldState, newState);
        }, 2000);
    }
}
