import type { PermissionsString } from "discord.js";
import { PermissionFlagsBits } from "discord.js";

export const PermissionFlags = Object.fromEntries(
    Object.keys(PermissionFlagsBits).map(key => [key, key])
) as Record<PermissionsString, PermissionsString>;

export const permissionBigintToString = (permission: bigint) => {
    const permissionName = Object.entries(PermissionFlagsBits).find(
        ([, value]) => value === permission
    )?.[0];
    return permissionName;
};
