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

import { Awaitable, GuildMember, PermissionResolvable } from "discord.js";

abstract class Permission {
    /**
     * The name of the permission.
     */
    protected abstract readonly name: string;

    /**
     * The equivalent Discord permissions.
     */
    protected readonly equivalentDiscordPermissions?: PermissionResolvable[];

    /**
     * The stringified representation of the object.
     *
     * @returns The name of the permission.
     */
    public toString(): string {
        return this.name;
    }

    public toDiscordPermissions(): PermissionResolvable[] {
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
}

export type PermissionLike = Permission | PermissionResolvable;
export { Permission };
