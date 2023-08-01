/*
* This file is part of SudoBot.
*
* Copyright (C) 2021-2023 OSN Developers.
*
* SudoBot is free software; you can redistribute it and/or modify it
* under the terms of the GNU Affero General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
*
* SudoBot is distributed in the hope that it will be useful, but
* WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
* along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
*/

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
