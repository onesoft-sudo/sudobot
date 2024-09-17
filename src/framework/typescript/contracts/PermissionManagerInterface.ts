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
