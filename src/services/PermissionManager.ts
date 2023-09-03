/**
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
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

import { PermissionLevel, PermissionRole } from "@prisma/client";
import { GuildMember, PermissionFlagsBits, PermissionResolvable, PermissionsString, Snowflake } from "discord.js";
import Service from "../core/Service";
import { GatewayEventListener } from "../decorators/GatewayEventListener";
import { HasEventListeners } from "../types/HasEventListeners";
import { PermissionLevelsRecord, getDefaultPermissionLevels } from "../utils/PermissionLevels";
import { log, logWarn } from "../utils/logger";

export const name = "permissionManager";

export default class PermissionManager extends Service implements HasEventListeners {
    public readonly users: Record<string, Map<string, PermissionRole> | undefined> = {};
    public readonly roles: Record<string, Map<string, PermissionRole> | undefined> = {};
    public readonly defaultLevels: PermissionLevelsRecord = getDefaultPermissionLevels();
    public readonly levels: Record<`${Snowflake}_${"u" | "r"}_${Snowflake}`, PermissionLevel | undefined> = {};
    public readonly permissionLevels: Record<string, number | undefined> = {};

    @GatewayEventListener("ready")
    async onReady() {
        await this.sync();
    }

    shouldModerate(member: GuildMember, moderator: GuildMember) {
        if (this.client.configManager.systemConfig.system_admins.includes(moderator.user.id)) return true;

        const config = this.client.configManager.config[member.guild.id];

        if (!config) return false;

        if (member.guild.ownerId === member.user.id) return false;
        if (member.guild.ownerId === moderator.user.id) return true;

        const { admin_role, mod_role, staff_role, mode } = config.permissions ?? {};

        if (member.roles.cache.hasAny(admin_role ?? "_", mod_role ?? "_", staff_role ?? "_")) {
            log("Member has roles that are immune to this action");
            return false;
        }

        if (member.roles.highest.position >= moderator.roles.highest.position) {
            log("Member has higher/equal roles than moderator");
            return false;
        }

        if (mode === "levels") {
            const { level: memberLevel } = this.getMemberPermissionLevel(member);
            const { level: moderatorLevel } = this.getMemberPermissionLevel(moderator);

            if (memberLevel >= moderatorLevel) {
                log("Member has higher/equal permission level than moderator");
                return false;
            }
        }

        return true;
    }

    isImmuneToAutoMod(member: GuildMember, permission?: PermissionResolvable[] | PermissionResolvable) {
        if (this.client.configManager.systemConfig.system_admins.includes(member.user.id)) return true;

        const config = this.client.configManager.config[member.guild.id];

        if (!config) return true;

        const { admin_role, mod_role, staff_role } = config.permissions ?? {};

        if (member.roles.cache.hasAny(admin_role ?? "_", mod_role ?? "_", staff_role ?? "_")) {
            log("Member has roles that are immune to automod");
            return true;
        }

        const hasDiscordPerms =
            member.permissions.has(PermissionFlagsBits.ManageGuild, true) ||
            (permission && member.permissions.has(permission, true));

        if (hasDiscordPerms) {
            log("Member has discord permissions that are immune to automod");
            return true;
        }

        const permissions = this.getMemberPermissions(member, false);
        const hasPermissions = permissions.has("Administrator") || permissions.has("ManageGuild");

        if (hasPermissions) log("Member has permissions that are immune to automod");

        return hasPermissions;
    }

    getPermissionsFromLevel(guildId: string, level: number) {
        if (level < 0 || level > 100) {
            throw new Error("Level must be a number between 0-100");
        }

        if (this.client.configManager.config[guildId]?.permissions.mode !== "levels") {
            return [];
        }

        for (const key in this.levels) {
            if (!key.startsWith(`${guildId}_`)) {
                continue;
            }

            const permissionLevel = this.levels[key as keyof typeof this.levels];

            if (permissionLevel?.level === level) {
                return (
                    permissionLevel.grantedPermissions.length > 0 ? permissionLevel.grantedPermissions : this.defaultLevels[level]
                ) as readonly PermissionsString[];
            }
        }

        return this.defaultLevels[level];
    }

    getMemberPermissionFromLevel(member: GuildMember, mergeWithDiscordPermissions?: boolean) {
        const { permissionLevel } = this.getMemberPermissionLevel(member);

        return new Set<PermissionsString>([
            ...(mergeWithDiscordPermissions ? member.permissions.toArray() : []),
            ...((permissionLevel && permissionLevel.grantedPermissions.length > 0
                ? permissionLevel?.grantedPermissions
                : permissionLevel && permissionLevel.grantedPermissions.length === 0
                ? this.defaultLevels[permissionLevel.level]
                : []) as PermissionsString[])
        ]);
    }

    getMemberPermissionLevel(member: GuildMember) {
        if (this.client.configManager.config[member.guild.id]?.permissions.mode !== "levels") {
            logWarn(
                "This guild does not use permission levels but getMemberPermissionLevel() was called. Assuming permission level is 0."
            );
            return { level: 0 };
        }

        let permissionLevel = this.levels[`${member.guild.id}_u_${member.user.id}`];

        for (const [id] of member.roles.cache) {
            const roleLevel = this.levels[`${member.guild.id}_r_${id}`];

            if ((roleLevel?.level ?? 0) > (permissionLevel?.level ?? 0)) {
                permissionLevel = roleLevel;
            }
        }

        return {
            level:
                (permissionLevel?.level ?? 0) < 0 ? 0 : (permissionLevel?.level ?? 0) > 100 ? 100 : permissionLevel?.level ?? 0,
            permissionLevel
        };
    }

    getPermissionsFromEntry(permissionRole: PermissionRole) {
        return permissionRole.grantedPermissions as readonly PermissionsString[];
    }

    getPermissionsFromEntries(permissionRoles: PermissionRole[]) {
        const permissionStrings = new Set<PermissionsString>();

        for (const permissionRole of permissionRoles) {
            for (const permission of permissionRole.grantedPermissions as readonly PermissionsString[]) {
                permissionStrings.add(permission);
            }
        }

        return permissionStrings;
    }

    getPermissionsFromPermissionRoleSet(permissionRole: PermissionRole) {
        return new Set(this.getPermissionsFromEntry(permissionRole));
    }

    getMemberPermissions(member: GuildMember, mergeWithDiscordPermissions?: boolean) {
        const guildUsesPermissionLevels = this.client.configManager.config[member.guild.id]?.permissions.mode === "levels";

        if (guildUsesPermissionLevels) {
            return this.getMemberPermissionFromLevel(member, mergeWithDiscordPermissions);
        }

        const allPermissions = new Set<PermissionsString>(mergeWithDiscordPermissions ? member.permissions.toArray() : []);

        if (this.users[member.guild.id]) {
            const permissions = this.users[`${member.guild.id}_${member.user.id}`];

            if (permissions) {
                for (const permission of permissions.values()) {
                    for (const key of permission.grantedPermissions) {
                        allPermissions.add(key as PermissionsString);
                    }
                }
            }
        }

        for (const [id] of member.roles.cache) {
            const permissions = this.roles[`${member.guild.id}_${id}`];

            if (!permissions) {
                continue;
            }

            for (const permission of permissions.values()) {
                for (const key of permission.grantedPermissions) {
                    allPermissions.add(key as PermissionsString);
                }
            }
        }

        return allPermissions;
    }

    async syncPermissionRoles(guildId?: string) {
        const permissionRoles = await this.client.prisma.permissionRole.findMany({
            where: {
                guild_id: guildId
            }
        });

        for (const permissionRole of permissionRoles) {
            const guildUsesPermissionLevels =
                this.client.configManager.config[permissionRole.guild_id]?.permissions.mode === "levels";

            if (guildUsesPermissionLevels) {
                continue;
            }

            for (const roleId of permissionRole.roles) {
                this.roles[`${permissionRole.guild_id}_${roleId}`] ??= new Map();
                this.roles[`${permissionRole.guild_id}_${roleId}`]!.set(permissionRole.name, permissionRole);
            }

            for (const userId of permissionRole.users) {
                this.users[`${permissionRole.guild_id}_${userId}`] ??= new Map();
                this.users[`${permissionRole.guild_id}_${userId}`]!.set(permissionRole.name, permissionRole);
            }
        }
    }

    async sync(guildId?: string) {
        log("Started syncing permission roles and levels", guildId ? `for guild ${guildId}` : "");

        await this.syncPermissionRoles(guildId);
        await this.syncPermissionLevels(guildId);

        log("Completed syncing permission roles and levels", guildId ? `for guild ${guildId}` : "");
    }

    private async syncPermissionLevels(guildId?: string) {
        const permissionLevels = await this.client.prisma.permissionLevel.findMany({
            where: {
                guildId
            }
        });

        for (const permissionLevel of permissionLevels) {
            const guildUsesPermissionLevels =
                this.client.configManager.config[permissionLevel.guildId]?.permissions.mode === "levels";

            if (!guildUsesPermissionLevels) {
                continue;
            }

            for (const userId of permissionLevel.users) {
                if (
                    this.levels[`${permissionLevel.guildId}_u_${userId}`] &&
                    this.levels[`${permissionLevel.guildId}_u_${userId}`]!.level <= permissionLevel.level
                ) {
                    continue;
                }

                this.levels[`${permissionLevel.guildId}_u_${userId}`] = permissionLevel;
            }

            for (const roleId of permissionLevel.roles) {
                if (
                    this.levels[`${permissionLevel.guildId}_r_${roleId}`] &&
                    this.levels[`${permissionLevel.guildId}_r_${roleId}`]!.level <= permissionLevel.level
                ) {
                    continue;
                }

                this.levels[`${permissionLevel.guildId}_r_${roleId}`] = permissionLevel;
            }
        }
    }

    async createPermissionRole({ guildId, name, permissions, roles, users }: Required<Omit<CreatePermissionLevelPayload, "id">>) {
        const existingPermissionLevel = await this.client.prisma.permissionRole.findFirst({
            where: {
                name,
                guild_id: guildId
            }
        });

        if (existingPermissionLevel) {
            return null;
        }

        const permissionLevel = await this.client.prisma.permissionRole.create({
            data: {
                name,
                guild_id: guildId,
                grantedPermissions: permissions,
                roles,
                users
            }
        });

        for (const roleId of permissionLevel.roles) {
            this.roles[`${permissionLevel.guild_id}_${roleId}`] ??= new Map();
            this.roles[`${permissionLevel.guild_id}_${roleId}`]!.set(permissionLevel.name, permissionLevel);
        }

        for (const userId of permissionLevel.users) {
            this.users[`${permissionLevel.guild_id}_${userId}`] ??= new Map();
            this.users[`${permissionLevel.guild_id}_${userId}`]!.set(permissionLevel.name, permissionLevel);
        }

        return permissionLevel;
    }

    async deletePermissionRole({ guildId, name, id }: Pick<CreatePermissionLevelPayload, "guildId" | "name" | "id">) {
        if (!name && !id) {
            throw new Error("ID and name both are null/undefined");
        }

        const permissionLevel = await this.client.prisma.permissionRole.findFirst({
            where: {
                name,
                id,
                guild_id: guildId
            }
        });

        if (!permissionLevel) return null;

        await this.client.prisma.permissionRole.delete({
            where: {
                id: permissionLevel.id
            }
        });

        for (const roleId of permissionLevel.roles) {
            this.roles[`${permissionLevel.guild_id}_${roleId}`] ??= new Map();

            if (this.roles[`${permissionLevel.guild_id}_${roleId}`]?.has(permissionLevel.name)) {
                this.roles[`${permissionLevel.guild_id}_${roleId}`]!.delete(permissionLevel.name);
            }
        }

        for (const userId of permissionLevel.users) {
            this.users[`${permissionLevel.guild_id}_${userId}`] ??= new Map();

            if (this.users[`${permissionLevel.guild_id}_${userId}`]?.has(permissionLevel.name)) {
                this.users[`${permissionLevel.guild_id}_${userId}`]!.delete(permissionLevel.name);
            }
        }

        return permissionLevel;
    }

    async updatePermissionRole({
        guildId,
        name,
        id,
        permissions,
        newName,
        roles,
        users
    }: CreatePermissionLevelPayload & { newName?: string }) {
        if (!name && !id) {
            throw new Error("ID and name both are null/undefined");
        }

        const existingPermissionLevel = await this.client.prisma.permissionRole.findFirst({
            where: {
                name,
                id,
                guild_id: guildId
            }
        });

        if (!existingPermissionLevel) {
            return null;
        }

        if (newName !== name || roles || users || permissions) {
            const permissionLevel = await this.client.prisma.permissionRole.update({
                where: {
                    id: existingPermissionLevel.id
                },
                data: {
                    name: newName,
                    roles,
                    users,
                    grantedPermissions: permissions
                }
            });

            for (const roleId of permissionLevel.roles) {
                this.roles[`${permissionLevel.guild_id}_${roleId}`] ??= new Map();

                if (this.roles[`${permissionLevel.guild_id}_${roleId}`]!.has(existingPermissionLevel.name)) {
                    this.roles[`${permissionLevel.guild_id}_${roleId}`]!.delete(existingPermissionLevel.name);
                }

                this.roles[`${permissionLevel.guild_id}_${roleId}`]!.set(permissionLevel.name, permissionLevel);
            }

            for (const userId of permissionLevel.users) {
                this.users[`${permissionLevel.guild_id}_${userId}`] ??= new Map();

                if (this.users[`${permissionLevel.guild_id}_${userId}`]!.has(existingPermissionLevel.name)) {
                    this.users[`${permissionLevel.guild_id}_${userId}`]!.delete(existingPermissionLevel.name);
                }

                this.users[`${permissionLevel.guild_id}_${userId}`]!.set(permissionLevel.name, permissionLevel);
            }

            return permissionLevel;
        }

        logWarn("Nothing updated");
        return false;
    }
}

interface CreatePermissionLevelPayload {
    guildId: Snowflake;
    name?: string;
    id?: number;
    permissions: PermissionsString[];
    roles?: Snowflake[];
    users?: Snowflake[];
}
