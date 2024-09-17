/*
* This file is part of SudoBot.
*
* Copyright (C) 2021-2024 OSN Developers.
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
