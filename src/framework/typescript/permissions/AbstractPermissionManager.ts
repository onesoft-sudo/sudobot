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

import type { APIInteractionGuildMember, Awaitable, GuildBasedChannel, PermissionResolvable, Role } from "discord.js";
import { PermissionsBitField, User } from "discord.js";
import type { GuildMember } from "discord.js";
import type { RawPermissionResolvable, SystemPermissionResolvable } from "./PermissionResolvable";
import Permission from "./Permission";
import type Application from "@framework/app/Application";

export type GetPermissionsResult = {
    discordPermissions: bigint;
    customPermissions: Permission[];
    grantAll: boolean;
};

abstract class AbstractPermissionManager {
    protected readonly application: Application;
    protected readonly permissionObjects: Permission[];

    public constructor(application: Application, permissions: SystemPermissionResolvable[]) {
        this.application = application;
        this.permissionObjects = permissions.map(c => Permission.resolve(application, c));
    }

    public hasPermissions(
        user: GuildMember | APIInteractionGuildMember | User,
        permissions?: RawPermissionResolvable,
        systemPermissions?: Iterable<SystemPermissionResolvable>
    ): Awaitable<boolean>;

    public async hasPermissions(
        user: GuildMember | APIInteractionGuildMember | User,
        permissions?: RawPermissionResolvable,
        systemPermissions?: Iterable<SystemPermissionResolvable>
    ): Promise<boolean> {
        if (user instanceof User && (Array.isArray(permissions) ? permissions.length > 0 : !!permissions)) {
            return false;
        }

        const computedPermissions =
            user instanceof User
                ? null
                : typeof user.permissions === "string"
                  ? new PermissionsBitField(user.permissions as PermissionResolvable)
                  : user.permissions;

        if (permissions && !computedPermissions?.has(permissions, true)) {
            return false;
        }

        if (systemPermissions) {
            for (const permission of systemPermissions) {
                const instance = Permission.resolve(this.application, permission);

                if (!(await instance.has(user))) {
                    return false;
                }
            }
        }

        return true;
    }

    public getPermissions(
        user: GuildMember | APIInteractionGuildMember | User,
        systemPermissions?: Iterable<SystemPermissionResolvable>
    ): Awaitable<GetPermissionsResult>;

    public async getPermissions(
        user: GuildMember | APIInteractionGuildMember | User,
        systemPermissions: Iterable<SystemPermissionResolvable> = this.permissionObjects
    ): Promise<GetPermissionsResult> {
        if (!systemPermissions) {
            return {
                customPermissions: [],
                discordPermissions: this.resolveDiscordPermissions(user),
                grantAll: false
            };
        }

        const customPermissions = [];

        for (const permission of systemPermissions) {
            const instance = Permission.resolve(this.application, permission);

            if (!(await instance.has(user))) {
                continue;
            }

            customPermissions.push(instance);
        }

        return {
            customPermissions,
            discordPermissions:
                user instanceof User
                    ? 0n
                    : typeof user.permissions === "string"
                      ? new PermissionsBitField(user.permissions as PermissionResolvable).bitfield
                      : user.permissions.bitfield,
            grantAll: false
        };
    }

    protected resolveDiscordPermissions(user: User | GuildMember | APIInteractionGuildMember) {
        return user instanceof User
            ? 0n
            : typeof user.permissions === "string"
              ? new PermissionsBitField(user.permissions as PermissionResolvable).bitfield
              : user.permissions.bitfield;
    }

    protected async customPermissionCheck(
        systemPermissions: Iterable<SystemPermissionResolvable>,
        user: GuildMember | APIInteractionGuildMember | User
    ) {
        const customPermissions = [];

        for (const permission of systemPermissions) {
            const instance = Permission.resolve(this.application, permission);

            if (!(await instance.has(user))) {
                continue;
            }

            customPermissions.push(instance);
        }

        return customPermissions;
    }

    public abstract getPermissionsOnChannel(
        member: GuildMember | APIInteractionGuildMember,
        targetChannel: GuildBasedChannel
    ): Awaitable<GetPermissionsResult>;
    public abstract getPermissionsOnRole(
        member: GuildMember | APIInteractionGuildMember,
        targetRole: Role
    ): Awaitable<GetPermissionsResult>;
    public abstract getPermissionsOnMember(
        member: GuildMember | APIInteractionGuildMember,
        targetMember: GuildMember | APIInteractionGuildMember
    ): Awaitable<GetPermissionsResult>;

    public abstract hasPermissionsOnChannel(
        member: GuildMember | APIInteractionGuildMember,
        targetChannel: GuildBasedChannel,
        permissions: RawPermissionResolvable
    ): Awaitable<boolean>;
    public abstract hasPermissionsOnRole(
        member: GuildMember | APIInteractionGuildMember,
        targetRole: Role,
        permissions: RawPermissionResolvable
    ): Awaitable<boolean>;
    public abstract hasPermissionsOnMember(
        member: GuildMember | APIInteractionGuildMember,
        targetMember: GuildMember | APIInteractionGuildMember,
        permissions: RawPermissionResolvable
    ): Awaitable<boolean>;
}

export default AbstractPermissionManager;
