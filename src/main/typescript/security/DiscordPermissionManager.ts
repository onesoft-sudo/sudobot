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

import FluentSet from "@framework/collections/FluentSet";
import type { MemberPermissionData } from "@framework/contracts/PermissionManagerInterface";
import AbstractPermissionManager from "@framework/permissions/AbstractPermissionManager";
import type { SystemPermissionResolvable } from "@framework/permissions/AbstractPermissionManagerService";
import { Permission } from "@framework/permissions/Permission";
import type { GuildMember, PermissionResolvable } from "discord.js";


class DiscordPermissionManager extends AbstractPermissionManager {
    public override async getMemberPermissions(member: GuildMember): Promise<MemberPermissionData> {
        return {
            grantedDiscordPermissions: new FluentSet(member.permissions.toArray()),
            grantedSystemPermissions: (await Permission.of(member)).map(permission =>
                permission.getName()
            )
        };
    }

    public override async hasPermissions(
        member: GuildMember,
        permissions: SystemPermissionResolvable[],
        _alreadyComputedPermissions?: MemberPermissionData
    ): Promise<boolean> {
        const discordPermissions: PermissionResolvable[] = [];

        for (const permission of permissions) {
            if (Permission.isDiscordPermission(permission)) {
                discordPermissions.push(permission as PermissionResolvable);
                continue;
            }

            const instance = await Permission.resolve(permission);

            if (!instance) {
                this.application.logger.warn(`Permission ${permission} does not exist.`);
                return false;
            }

            if (!(await instance.has(member))) {
                return false;
            }
        }

        return member.permissions.has(discordPermissions, true);
    }
}

export default DiscordPermissionManager;
