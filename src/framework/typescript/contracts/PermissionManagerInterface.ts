import type { Awaitable, GuildMember, PermissionsString } from "discord.js";
import type FluentSet from "../collections/FluentSet";
import type {
    SystemPermissionLikeString,
    SystemPermissionResolvable
} from "../permissions/AbstractPermissionManagerService";

export type MemberPermissionData = {
    grantedDiscordPermissions: FluentSet<PermissionsString>;
    grantedSystemPermissions: FluentSet<SystemPermissionLikeString>;
};

export interface PermissionManagerInterface {
    getMemberPermissions(member: GuildMember): Awaitable<MemberPermissionData>;
    hasPermissions(
        member: GuildMember,
        permissions: SystemPermissionResolvable[],
        alreadyComputedPermissions?: MemberPermissionData
    ): Awaitable<boolean>;
    canBypassAutoModeration(member: GuildMember): Awaitable<boolean>;
    hasDiscordPermissions(
        member: GuildMember,
        permissions: SystemPermissionResolvable[]
    ): Awaitable<boolean>;
}
