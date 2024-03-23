import {
    Awaitable,
    Collection,
    GuildMember,
    PermissionFlagsBits,
    PermissionResolvable,
    PermissionsString
} from "discord.js";
import { Service } from "../services/Service";
import { MemberPermissionData } from "./AbstractPermissionManager";
import { Permission } from "./Permission";

declare global {
    interface SystemPermissionStrings {}
}

export type SystemPermissionLikeString = Exclude<keyof SystemPermissionStrings, number | symbol>;

export type PermissionLikeString = SystemPermissionLikeString | PermissionsString;

export type SystemPermissionResolvable = PermissionResolvable | SystemOnlyPermissionResolvable;

export type SystemOnlyPermissionResolvable =
    | SystemPermissionLikeString
    | Permission
    | typeof Permission;

abstract class AbstractPermissionManagerService extends Service {
    protected readonly permissionInstances = new Collection<
        SystemPermissionLikeString,
        Permission
    >();

    private _sysAdminPermission: Permission | undefined = undefined;

    public async getSystemAdminPermission() {
        if (!this._sysAdminPermission) {
            this._sysAdminPermission = await Permission.resolve("system.admin");

            if (!this._sysAdminPermission) {
                throw new Error("Failed to resolve system admin permission");
            }
        }

        return this._sysAdminPermission;
    }

    public loadPermission(permission: Permission) {
        this.permissionInstances.set(
            permission.toString() as SystemPermissionLikeString,
            permission
        );
    }

    public getPermissionByName(name: string): Permission | undefined {
        return this.permissionInstances.get(name as SystemPermissionLikeString);
    }

    public getAllPermissions(): Collection<SystemPermissionLikeString, Permission> {
        return this.permissionInstances;
    }

    public abstract getMemberPermissions(member: GuildMember): Awaitable<MemberPermissionData>;

    public async isSystemAdmin(member: GuildMember, permissionData?: MemberPermissionData) {
        const systemAdminPermission = await this.getSystemAdminPermission();

        if (await systemAdminPermission.has(member)) {
            return true;
        }

        const mode =
            this.application.getServiceByName("configManager").config[member.guild.id]?.permissions
                .mode ?? "discord";

        if (mode !== "discord") {
            permissionData ??= await this.getMemberPermissions(member);
            return permissionData.grantedSystemPermissions.has(systemAdminPermission.getName());
        }

        return false;
    }

    public async canBypassGuildRestrictions(member: GuildMember) {
        return (
            member.guild.ownerId === member.id ||
            member.permissions.has(PermissionFlagsBits.Administrator, true)
        );
    }
}

export { AbstractPermissionManagerService };
