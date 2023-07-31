import { PermissionsString } from "discord.js";

export type PermissionLevelsRecord = Record<number, readonly PermissionsString[]>;

export const RawPermissionLevels: readonly (readonly PermissionsString[])[] = [
    ["CreatePublicThreads"],
    ["CreatePrivateThreads"],
    [],
    [],
    ["MoveMembers"],
    ["MuteMembers"],
    ["DeafenMembers"],
    ["ManageEmojisAndStickers"],
    ["ManageGuildExpressions"],
    ["ManageMessages"],
    ["ModerateMembers"],
    ["ManageNicknames"],
    ["KickMembers"],
    ["BanMembers"],
    ["ViewAuditLog"],
    ["ViewGuildInsights"],
    ["ViewCreatorMonetizationAnalytics"],
    ["MentionEveryone"],
    ["ManageThreads"],
    ["ManageEvents"],
    ["ManageChannels"],
    ["ManageRoles"],
    ["ManageGuild"],
    ["ManageWebhooks"],
    ["Administrator"]
] as const;

export function getPermissionLevelArray() {
    const permissionLevels = [];
    let lastPermissionLevel = [];

    for (const level of RawPermissionLevels) {
        lastPermissionLevel.push(...level);
        permissionLevels.push([...lastPermissionLevel]);
    }

    return permissionLevels;
}

export function getPermissionLevels() {
    const record: PermissionLevelsRecord = {};

    let lastPermissionLevel: PermissionsString[] = [];
    let level = 0;

    for (const rawPermissionlevel of RawPermissionLevels) {
        const array = [...lastPermissionLevel];

        for (let i = 0; i < 4; i++) {
            record[level++] = array;
        }

        lastPermissionLevel.push(...rawPermissionlevel);
    }

    return record;
}
