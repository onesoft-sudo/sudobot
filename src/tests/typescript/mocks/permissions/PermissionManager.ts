/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025 OSN Developers.
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

import type { GetPermissionsResult } from "@framework/permissions/AbstractPermissionManager";
import AbstractPermissionManager from "@framework/permissions/AbstractPermissionManager";
import type { RawPermissionResolvable, SystemPermissionResolvable } from "@framework/permissions/PermissionResolvable";
import type { Awaitable, GuildMember, APIInteractionGuildMember, Role, GuildBasedChannel, User } from "discord.js";

class PermissionManager extends AbstractPermissionManager {
    public override hasPermissions(
        user: GuildMember | APIInteractionGuildMember | User,
        permissions?: RawPermissionResolvable,
        systemPermissions?: Iterable<SystemPermissionResolvable>
    ): Awaitable<boolean> {
        return super.hasPermissions(user, permissions, systemPermissions);
    }

    public override getPermissions(member: GuildMember | APIInteractionGuildMember): Awaitable<GetPermissionsResult> {
        return super.getPermissions(member);
    }

    public override getPermissionsOnChannel(
        member: GuildMember | APIInteractionGuildMember
    ): Awaitable<GetPermissionsResult> {
        return this.getPermissions(member);
    }

    public override getPermissionsOnRole(
        _member: GuildMember | APIInteractionGuildMember,
        _targetRole: Role
    ): Awaitable<GetPermissionsResult> {
        throw new Error("Method not implemented.");
    }

    public override getPermissionsOnMember(
        _member: GuildMember | APIInteractionGuildMember,
        _targetMember: GuildMember | APIInteractionGuildMember
    ): Awaitable<GetPermissionsResult> {
        throw new Error("Method not implemented.");
    }

    public override hasPermissionsOnChannel(
        _member: GuildMember | APIInteractionGuildMember,
        _targetChannel: GuildBasedChannel,
        _permissions: RawPermissionResolvable
    ): Awaitable<boolean> {
        throw new Error("Method not implemented.");
    }

    public override hasPermissionsOnRole(
        _member: GuildMember | APIInteractionGuildMember,
        _targetRole: Role,
        _permissions: RawPermissionResolvable
    ): Awaitable<boolean> {
        throw new Error("Method not implemented.");
    }

    public override hasPermissionsOnMember(
        _member: GuildMember | APIInteractionGuildMember,
        _targetMember: GuildMember | APIInteractionGuildMember,
        _permissions: RawPermissionResolvable
    ): Awaitable<boolean> {
        throw new Error("Method not implemented.");
    }
}

export default PermissionManager;
