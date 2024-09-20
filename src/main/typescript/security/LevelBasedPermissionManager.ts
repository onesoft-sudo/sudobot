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
import type { SystemPermissionLikeString } from "@framework/permissions/AbstractPermissionManagerService";
import { Permission } from "@framework/permissions/Permission";
import { permissionLevels, type PermissionLevel } from "@main/models/PermissionLevel";
import type { GuildMember, PermissionsString, Snowflake } from "discord.js";
import { Collection } from "discord.js";
import { eq } from "drizzle-orm";

type MinimalPermissionLevelInfo = {
    level: number;
    grantedDiscordPermissions: FluentSet<PermissionsString>;
    grantedSystemPermissions: FluentSet<SystemPermissionLikeString>;
};


class LevelBasedPermissionManager extends AbstractPermissionManager {
    protected readonly levels = new Collection<
        `${Snowflake}:${Snowflake}`,
        MinimalPermissionLevelInfo
    >();

    public override async boot(): Promise<void> {
        this.levels.clear();

        const levels = await this.application.database.query.permissionLevels.findMany({
            where: eq(permissionLevels.disabled, false)
        });

        for (const level of levels) {
            const info = this.makeCache(level);

            for (const id of [...level.users, ...level.roles]) {
                const key = `${level.guildId}:${id}` as const;
                const existing = this.levels.get(key);
                const minimalLevelInfo = existing ? this.mergeLevels(existing, info) : info;
                this.levels.set(key, minimalLevelInfo);
            }
        }

        this.application.logger.info(`Loaded ${this.levels.size} permission levels.`);
    }

    private mergeLevels(
        ...levels: Array<MinimalPermissionLevelInfo | undefined | null>
    ): MinimalPermissionLevelInfo {
        const grantedDiscordPermissions = new FluentSet<PermissionsString>();
        const grantedSystemPermissions = new FluentSet<SystemPermissionLikeString>();
        let level = 0;

        for (const newLevel of levels) {
            if (!newLevel) {
                continue;
            }

            grantedDiscordPermissions.add(...newLevel.grantedDiscordPermissions);
            grantedSystemPermissions.add(...newLevel.grantedSystemPermissions);
            level = Math.max(level, newLevel.level);
        }

        return {
            grantedDiscordPermissions,
            grantedSystemPermissions,
            level
        } satisfies MinimalPermissionLevelInfo;
    }

    private makeCache(level: PermissionLevel) {
        const grantedSystemPermissions = new FluentSet<SystemPermissionLikeString>();
        const grantedDiscordPermissions = new FluentSet<PermissionsString>(
            level.grantedDiscordPermissions as PermissionsString[]
        );

        for (const permission of level.grantedSystemPermissions) {
            const instance = Permission.fromString(permission);

            if (!instance) {
                this.application.logger.warn(`Permission ${permission} does not exist.`);
                continue;
            }

            grantedSystemPermissions.add(instance.getName());
        }

        const info = {
            level: level.level,
            grantedDiscordPermissions,
            grantedSystemPermissions
        } satisfies MinimalPermissionLevelInfo;

        return info;
    }

    public override async getMemberPermissions(member: GuildMember): Promise<
        MemberPermissionData & {
            level: number;
        }
    > {
        const permissionManager = this.application.service("permissionManager");
        const globalUserLevel = this.levels.get(`0:${member.user.id}`);
        const globalEveryoneLevel = this.levels.get("0:0");
        const memberLevel = this.levels.get(`${member.guild.id}:${member.user.id}`);
        const levelsToMerge = [memberLevel, globalEveryoneLevel, globalUserLevel];

        for (const role of member.roles.cache.values()) {
            const roleLevel = this.levels.get(`${member.guild.id}:${role.id}`);

            if (!roleLevel) {
                continue;
            }

            levelsToMerge.push(roleLevel);
        }

        const merged = this.mergeLevels(...levelsToMerge);
        merged.grantedDiscordPermissions.add(...member.permissions.toArray());

        const allPermissions = permissionManager.getAllPermissions().values();

        for (const permission of allPermissions) {
            const name = permission.getName();

            if ((await permission.has(member)) && !merged.grantedSystemPermissions.has(name)) {
                merged.grantedSystemPermissions.add(name);
            }
        }

        return {
            ...merged,
            level: (await permissionManager.isSystemAdmin(member))
                ? Number.POSITIVE_INFINITY
                : merged.level
        };
    }

    public async getMemberLevel(member: GuildMember): Promise<number> {
        const permissions = await this.getMemberPermissions(member);
        return permissions.level;
    }
}

export default LevelBasedPermissionManager;
