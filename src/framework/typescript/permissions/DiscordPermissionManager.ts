/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025, 2026 OSN Developers.
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

import type { GuildMember, User, Awaitable } from "discord.js";
import AbstractImplicitPermissionManager from "./AbstractImplicitPermissionManager";
import type { GetPermissionsResult } from "./AbstractPermissionManager";
import type { RawPermissionResolvable, SystemPermissionResolvable } from "./PermissionResolvable";

class DiscordPermissionManager extends AbstractImplicitPermissionManager {
    public override async getPermissions(
        user: GuildMember | User,
        systemPermissions: Iterable<SystemPermissionResolvable> = this.permissionObjects.values()
    ): Promise<GetPermissionsResult> {
        return {
            customPermissions: systemPermissions ? await this.customPermissionCheck(systemPermissions, user) : undefined,
            discordPermissions: this.resolveDiscordPermissions(user),
            grantAll: false
        };
    }

    public override hasPermissions(
        user: GuildMember | User,
        permissions?: RawPermissionResolvable,
        systemPermissions?: Iterable<SystemPermissionResolvable>
    ): Awaitable<boolean> {
        return super.hasPermissions(user, permissions, systemPermissions);
    }
}

export default DiscordPermissionManager;
