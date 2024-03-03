import EventListener from "../core/EventListener";
import { Events } from "../types/ClientEvents";
import { AuditLogEvent, VoiceChannel, VoiceState } from "discord.js";
import { safeChannelFetch } from "../utils/fetch";

export default class VoiceStateUpdateEventListener extends EventListener<Events.VoiceStateUpdate> {
    public readonly name = Events.VoiceStateUpdate;

    async execute(oldState: VoiceState, newState: VoiceState) {
        if (oldState.channelId === newState.channelId) {
            return;
        }

        const time = Date.now();
        let oldChannel = oldState.channel;
        let newChannel = newState.channel;

        if (!oldChannel && oldState.channelId) {
            oldChannel = <VoiceChannel>await safeChannelFetch(oldState.guild, oldState.channelId);
        }

        if (!newChannel && newState.channelId) {
            newChannel = <VoiceChannel>await safeChannelFetch(newState.guild, newState.channelId);
        }

        setTimeout(async () => {
            if (oldChannel && !newChannel) {
                const auditLogEntries = await newState.guild
                    .fetchAuditLogs({
                        type: AuditLogEvent.MemberDisconnect,
                        limit: 1
                    })
                    .catch(() => null);

                const auditLogEntry = auditLogEntries?.entries.find(e => e.createdAt.getTime() > time - 2_000);

                if (auditLogEntry && oldChannel) {
                    await this.client.loggerService.logMemberDisconnect({
                        user: newState.member?.user ?? oldState.member!.user,
                        moderator: auditLogEntry.executor!,
                        guild: newState.guild,
                        channel: oldChannel as VoiceChannel
                    });

                    return;
                }
            }

            if (oldChannel && newChannel) {
                const auditLogEntries = await newState.guild
                    .fetchAuditLogs({
                        type: AuditLogEvent.MemberMove,
                        limit: 1
                    })
                    .catch(() => null);

                const auditLogEntry = auditLogEntries?.entries.find(e => e.createdAt.getTime() > time - 2_000);

                if (auditLogEntry) {
                    await this.client.loggerService.logMemberVoiceMove({
                        user: newState.member?.user ?? oldState.member!.user,
                        moderator: auditLogEntry.executor!,
                        guild: newState.guild,
                        oldChannel: oldChannel as VoiceChannel,
                        newChannel: newChannel as VoiceChannel
                    });

                    return;
                }
            }

            if (oldChannel && newChannel) {
                return;
            }

            await this.client.loggerService.logVoiceChannelStateUpdate(
                newState.member?.user ?? oldState.member!.user,
                oldChannel,
                newChannel
            );
        }, 2000);
    }
}
