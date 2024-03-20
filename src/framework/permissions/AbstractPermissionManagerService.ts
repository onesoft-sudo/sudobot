import { Collection, PermissionResolvable, PermissionsString } from "discord.js";
import { Service } from "../services/Service";
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

    public loadPermission(permission: Permission) {
        this.permissionInstances.set(
            permission.toString() as SystemPermissionLikeString,
            permission
        );
    }

    public getPermissionByName(name: string): Permission | undefined {
        return this.permissionInstances.get(name as SystemPermissionLikeString);
    }
}

export { AbstractPermissionManagerService };
