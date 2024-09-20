/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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
import { PermissionFlagsBits } from "discord.js";
import Application from "../app/Application";
import FluentSet from "../collections/FluentSet";
import Container from "../container/Container";
import type { PermissionManagerServiceInterface } from "../contracts/PermissionManagerServiceInterface";
import { Singleton } from "../types/Singleton";
import type { SystemPermissionResolvable } from "./AbstractPermissionManagerService";

abstract class Permission extends Singleton {
    
    protected abstract readonly name: string;

    
    public override toString(): string {
        return this.name;
    }

    public async has(member: GuildMember) {
        return !!(await this.validate?.(member));
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
        const permissionManager = Application.current().service(
            "permissionManager"
        ) satisfies PermissionManagerServiceInterface;
        return permissionManager.getPermissionByName(permission);
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

    public static isDiscordPermission(permission: unknown): permission is PermissionsString {
        return typeof permission === "string" && permission in PermissionFlagsBits;
    }

    public static async of(member: GuildMember, exclude?: Permission[]) {
        const permissions = new FluentSet<Permission>();
        const permissionManager = Application.current().service(
            "permissionManager"
        ) satisfies PermissionManagerServiceInterface;
        const allPermissions = permissionManager.getAllPermissions().values();

        for (const permission of allPermissions) {
            if (exclude?.includes(permission)) {
                continue;
            }

            if (await permission.has(member)) {
                permissions.add(permission);
            }
        }

        return permissions;
    }

    public getName() {
        return this.name as keyof SystemPermissionStrings;
    }
}

export type PermissionLike = Permission | PermissionsString;
export { Permission };
