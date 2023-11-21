import { Awaitable, GuildMember, PermissionResolvable } from "discord.js";
import Client from "../core/Client";
import { GetMemberPermissionInGuildResult } from "../services/PermissionManager";

export default abstract class AbstractPermissionManager {
    protected hasSyncedInitially = false;

    constructor(protected readonly client: Client) {}

    triggerSyncIfNeeded() {
        if (!this.hasSyncedInitially) {
            this.hasSyncedInitially = true;
            return this.sync();
        }

        return null;
    }

    abstract sync(): Awaitable<void>;
    abstract shouldModerate(member: GuildMember, moderator: GuildMember): Awaitable<boolean>;
    abstract isImmuneToAutoMod(
        member: GuildMember,
        permission?: PermissionResolvable[] | PermissionResolvable
    ): Awaitable<boolean>;
    abstract getMemberPermissions(member: GuildMember, mergeWithDiscordPermissions?: boolean): GetMemberPermissionInGuildResult;
}
