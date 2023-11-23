import { Awaitable, GuildMember, PermissionResolvable } from "discord.js";
import { GetMemberPermissionInGuildResult } from "../services/PermissionManager";
import AbstractPermissionManager from "./AbstractPermissionManager";

export default class DiscordBasedPermissionManager extends AbstractPermissionManager {
    shouldModerate(member: GuildMember, moderator: GuildMember) {
        return false;
    }

    isImmuneToAutoMod(
        member: GuildMember,
        permission?: PermissionResolvable | PermissionResolvable[] | undefined
    ): Awaitable<boolean> {
        return false;
    }

    getMemberPermissions(
        member: GuildMember,
        mergeWithDiscordPermissions?: boolean | undefined
    ): GetMemberPermissionInGuildResult {
        return {
            type: "discord",
            permissions: member.permissions
        };
    }
}
