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

import {
    Awaitable,
    GuildMember,
    PermissionFlagsBits,
    PermissionResolvable,
    PermissionsString
} from "discord.js";
import Client from "../../core/Client";
import Container from "../container/Container";
import { Singleton } from "../types/Singleton";
import { SystemPermissionResolvable } from "./AbstractPermissionManagerService";

abstract class Permission extends Singleton {
    /**
     * The name of the permission.
     */
    protected abstract readonly name: string;

    /**
     * The equivalent Discord permissions.
     */
    protected readonly equivalentDiscordPermissions?: PermissionsString[];

    /**
     * The stringified representation of the object.
     *
     * @returns The name of the permission.
     */
    public override toString(): string {
        return this.name;
    }

    public toDiscordPermissions(): PermissionsString[] {
        return this.equivalentDiscordPermissions ?? [];
    }

    public async has(member: GuildMember) {
        if (this.equivalentDiscordPermissions !== undefined) {
            return member.permissions.has(this.equivalentDiscordPermissions, true);
        }

        return !!(await this.validate?.(member));
    }

    public canConvertToDiscordPermissions(): boolean {
        return this.equivalentDiscordPermissions !== undefined;
    }

    protected validate?(member: GuildMember): Awaitable<boolean>;

    protected static override createInstance(): Permission {
        return Container.getInstance().resolveByClass(
            this as unknown as new () => Permission,
            undefined,
            false
        );
    }

    public static fromString(permission: string): Permission | undefined {
        return Client.instance
            .getServiceByName("permissionManager")
            .getPermissionByName(permission);
    }

    public static async resolve(
        permission: SystemPermissionResolvable
    ): Promise<Permission | undefined> {
        if (typeof permission === "function") {
            return await permission.getInstance<Permission>();
        }

        if (permission instanceof Permission) {
            return permission;
        }

        if (typeof permission === "string") {
            return Permission.fromString(permission);
        }

        return undefined;
    }

    public static isDiscordPermission(permission: unknown): permission is PermissionResolvable {
        return (
            (typeof permission === "string" && permission in PermissionFlagsBits) ||
            typeof permission === "bigint" ||
            typeof permission === "number"
        );
    }
}

export type PermissionLike = Permission | PermissionResolvable;
export { Permission };
