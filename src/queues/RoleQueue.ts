import { Snowflake } from "discord.js";
import Queue from "../framework/queues/Queue";
import { safeMemberFetch } from "../utils/fetch";

type RoleQueuePayload = {
    memberId: Snowflake;
    guildId: Snowflake;
    roleIds: Snowflake[];
    reason?: string;
    mode: "add" | "remove";
};

class RoleQueue extends Queue<RoleQueuePayload> {
    public static override readonly uniqueName = "role";

    public async execute({ guildId, memberId, mode, roleIds, reason }: RoleQueuePayload) {
        const guild = this.application.client.guilds.cache.get(guildId);

        if (!guild) {
            return;
        }

        const member = await safeMemberFetch(guild, memberId);

        if (!member) {
            return;
        }

        if (mode === "add") {
            await member.roles.add(roleIds, reason).catch(console.error);
        } else {
            await member.roles.remove(roleIds, reason).catch(console.error);
        }
    }
}

export default RoleQueue;
