import Queue from "../utils/Queue";
import { log, logError } from "../utils/logger";

export default class UnbanQueue extends Queue {
    async run(userId: string) {
        try {
            log("Unbanning user");

            const user = this.client.users.cache.get(userId) ?? (await this.client.users.fetch(userId));

            if (!user)
                throw new Error("User is null | undefined");

            await this.client.infractionManager.removeUserBan(user, {
                guild: this.guild,
                moderator: this.client.user!,
                autoRemoveQueue: true,
                reason: "*This ban has expired*",
                sendLog: true,
            }).catch(logError);
        }
        catch (e) {
            logError(e);
        }
    }
}