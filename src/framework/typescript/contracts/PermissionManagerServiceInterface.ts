import type { Awaitable, Collection, GuildMember } from "discord.js";
import type {
    SystemPermissionLikeString,
    SystemPermissionResolvable
} from "../permissions/AbstractPermissionManagerService";
import type { Permission } from "../permissions/Permission";
import type { MemberPermissionData } from "./PermissionManagerInterface";

export interface PermissionManagerServiceInterface {
    isSystemAdmin(member: GuildMember, permissionData?: MemberPermissionData): Awaitable<boolean>;
    getMemberPermissions(member: GuildMember): Awaitable<MemberPermissionData>;
    canBypassGuildRestrictions(member: GuildMember): Awaitable<boolean>;
    getAllPermissions(): Collection<SystemPermissionLikeString, Permission>;
    getPermissionByName(name: string): Permission | undefined;
    loadPermission(permission: Permission): void;
    getSystemAdminPermission(): Awaitable<Permission>;
    hasPermissions(
        member: GuildMember,
        permissions: SystemPermissionResolvable[],
        alreadyComputedPermissions?: MemberPermissionData
    ): Awaitable<boolean>;
}
