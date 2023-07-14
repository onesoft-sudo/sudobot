import Queue from "../utils/Queue";
import { log, logError } from "../utils/logger";

export default class UnmuteQueue extends Queue {
    async run(userId: string) {
        try {
            log("Unmuting user");

            const member = this.guild.members.cache.get(userId) ?? (await this.guild.members.fetch(userId));

            if (!member)
                throw new Error("Member is null | undefined");

            await this.client.infractionManager.removeMemberMute(member, {
                guild: this.guild,
                moderator: this.client.user!,
                autoRemoveQueue: true,
                notifyUser: true,
                reason: "*Your mute has expired*",
                sendLog: true
            }).catch(logError);
        }
        catch (e) {
            logError(e);
        }
    }
}