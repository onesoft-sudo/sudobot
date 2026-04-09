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

import type { GuildMember, GuildBasedChannel, Awaitable, Role } from "discord.js";
import type { GetPermissionsResult } from "./AbstractPermissionManager";
import AbstractPermissionManager from "./AbstractPermissionManager";
import type { RawPermissionResolvable } from "./PermissionResolvable";

abstract class AbstractImplicitPermissionManager extends AbstractPermissionManager {
    public override getPermissionsOnChannel(
        member: GuildMember,
        _targetChannel: GuildBasedChannel
    ): Awaitable<GetPermissionsResult> {
        return this.getPermissions(member);
    }

    public override getPermissionsOnRole(
        member: GuildMember,
        _targetRole: Role
    ): Awaitable<GetPermissionsResult> {
        return this.getPermissions(member);
    }

    public override getPermissionsOnMember(
        member: GuildMember,
        _targetMember: GuildMember
    ): Awaitable<GetPermissionsResult> {
        return this.getPermissions(member);
    }

    public override hasPermissionsOnChannel(
        member: GuildMember,
        _targetChannel: GuildBasedChannel,
        permissions: RawPermissionResolvable
    ): Awaitable<boolean> {
        return this.hasPermissions(member, permissions);
    }

    public override hasPermissionsOnRole(
        member: GuildMember,
        _targetRole: Role,
        permissions: RawPermissionResolvable
    ): Awaitable<boolean> {
        return this.hasPermissions(member, permissions);
    }

    public override hasPermissionsOnMember(
        member: GuildMember,
        targetMember: GuildMember,
        permissions: RawPermissionResolvable
    ): Awaitable<boolean>;

    public override async hasPermissionsOnMember(
        member: GuildMember,
        targetMember: GuildMember,
        permissions: RawPermissionResolvable
    ): Promise<boolean> {
        return member.roles.highest.position > targetMember.roles.highest.position && await this.hasPermissions(member, permissions);
    }
}

export default AbstractImplicitPermissionManager;
