import type { PermissionsString } from "discord.js";
import type Permission from "./Permission";

export type SimplePermissionResolvable = PermissionsString | bigint | Permission | typeof Permission;
export type PermissionResolvable = SimplePermissionResolvable | Array<SimplePermissionResolvable>;
export type RawPermissionResolvable = PermissionsString | bigint | Array<PermissionsString | bigint>;
