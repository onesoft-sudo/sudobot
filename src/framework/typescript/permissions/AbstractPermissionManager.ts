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

import type { Awaitable, GuildMember, PermissionResolvable } from "discord.js";
import type Application from "../app/Application";
import type {
    MemberPermissionData,
    PermissionManagerInterface
} from "../contracts/PermissionManagerInterface";
import type { SystemPermissionResolvable } from "./AbstractPermissionManagerService";
import { Permission } from "./Permission";

abstract class AbstractPermissionManager implements PermissionManagerInterface {
    public constructor(protected readonly application: Application) {}

    public canModerate?(member: GuildMember, moderator: GuildMember): Awaitable<boolean>;

    public async hasDiscordPermissions(
        member: GuildMember,
        permissions: SystemPermissionResolvable[]
    ): Promise<boolean> {
        for (const permission of permissions) {
            if (Permission.isDiscordPermission(permission)) {
                if (!member.permissions.has(permission, true)) {
                    return false;
                }

                continue;
            }

            const instance = await Permission.resolve(permission);

            if (!instance) {
                this.application.logger.warn(
                    `Permission ${permission?.toString()} does not exist.`
                );
                return false;
            }

            if (!(await instance.has(member))) {
                return false;
            }
        }

        return true;
    }

    public async hasPermissions(
        member: GuildMember,
        permissions: SystemPermissionResolvable[],
        alreadyComputedPermissions?: MemberPermissionData
    ): Promise<boolean> {
        const { grantedDiscordPermissions, grantedSystemPermissions } =
            alreadyComputedPermissions ?? (await this.getMemberPermissions(member));

        for (const permission of permissions) {
            const instance: PermissionResolvable | Permission | undefined =
                typeof permission === "function"
                    ? await permission.getInstance<Permission>()
                    : typeof permission === "string"
                      ? Permission.fromString(permission)
                      : permission;

            if (!instance) {
                this.application.logger.debug(
                    `Permission ${permission?.toString()} does not exist`
                );
                continue;
            }

            if (Permission.isDiscordPermission(instance)) {
                if (
                    !grantedDiscordPermissions.has(instance) &&
                    !member.permissions.has(instance, true)
                ) {
                    return false;
                }

                continue;
            }

            if (
                !grantedSystemPermissions.has(instance.getName()) &&
                !(await instance.has(member))
            ) {
                return false;
            }
        }

        return true;
    }

    public canBypassAutoModeration(member: GuildMember): Awaitable<boolean> {
        return this.hasPermissions(member, ["ManageGuild"]);
    }

    public boot?(): Awaitable<void>;
    public abstract getMemberPermissions(member: GuildMember): Awaitable<MemberPermissionData>;
}

export default AbstractPermissionManager;
