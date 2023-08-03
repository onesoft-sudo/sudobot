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

import { PermissionRole } from "@prisma/client";
import { GuildMember, PermissionFlagsBits, PermissionResolvable, PermissionsString, Snowflake } from "discord.js";
import Service from "../core/Service";
import { GatewayEventListener } from "../decorators/GatewayEventListener";
import { HasEventListeners } from "../types/HasEventListeners";
import { PermissionLevelsRecord, getPermissionLevels } from "../utils/PermissionLevels";
import { log, logWarn } from "../utils/logger";

export const name = "permissionManager";

export default class PermissionManager extends Service implements HasEventListeners {
    public readonly users: Record<string, Map<string, PermissionRole> | undefined> = {};
    public readonly roles: Record<string, Map<string, PermissionRole> | undefined> = {};
    public readonly levels: PermissionLevelsRecord = getPermissionLevels();
    public readonly guildPermissionLevels: Record<string, number | undefined> = {};

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

        const { admin_role, mod_role, staff_role } = config.permissions ?? {};

        if (member.roles.cache.hasAny(admin_role ?? "_", mod_role ?? "_", staff_role ?? "_")) {
            log("Member has roles that are immune to this action");
            return false;
        }

        if (member.permissions.has(PermissionFlagsBits.Administrator)) {
            log("Member has administrator permissions");
            return false;
        }

        if (member.roles.highest.position >= moderator.roles.highest.position) {
            log("Member has higher roles than moderator");
            return false;
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
            member.permissions.has(PermissionFlagsBits.ManageGuild, true) || (permission && member.permissions.has(permission, true));

        if (hasDiscordPerms) {
            log("Member has discord permissions that are immune to automod");
            return true;
        }

        const permissions = this.getMemberPermissions(member, false);
        const hasPermissions = permissions.has("Administrator") || permissions.has("ManageGuild");

        if (hasPermissions) log("Member has permissions that are immune to automod");

        return hasPermissions;
    }

    getMemberPermissionFromLevel(member: GuildMember, mergeWithDiscordPermissions?: boolean) {
        const level = this.getMemberPermissionLevel(member);

        return new Set<PermissionsString>([...(mergeWithDiscordPermissions ? member.permissions.toArray() : []), ...this.levels[level]]);
    }

    getMemberPermissionLevel(member: GuildMember) {
        let level = this.guildPermissionLevels[`${member.guild.id}_u_${member.user.id}`] ?? 0;

        for (const [id] of member.roles.cache) {
            const roleLevel = this.guildPermissionLevels[`${member.guild.id}_r_${id}`] ?? 0;

            if (roleLevel > level) {
                level = roleLevel;
            }
        }

        return level < 0 ? 0 : level > 100 ? 100 : level;
    }

    getPermissionsFromPermissionRole(permissionRole: PermissionRole, guildId: string) {
        const guildUsesPermissionLevels = this.client.configManager.config[guildId]?.permissions.mode === "levels";

        if (guildUsesPermissionLevels && permissionRole.level !== undefined && permissionRole.level !== null) {
            return this.levels[permissionRole.level];
        }

        return permissionRole.grantedPermissions as readonly PermissionsString[];
    }

    getPermissionsFromPermissionRoles(permissionRoles: PermissionRole[], guildId: string) {
        const guildUsesPermissionLevels = this.client.configManager.config[guildId]?.permissions.mode === "levels";
        const permissionStrings = new Set<PermissionsString>();

        for (const permissionRole of permissionRoles) {
            if (guildUsesPermissionLevels && permissionRole.level !== undefined && permissionRole.level !== null) {
                for (const permission of this.levels[permissionRole.level]) {
                    permissionStrings.add(permission);
                }
            } else {
                for (const permission of permissionRole.grantedPermissions as readonly PermissionsString[]) {
                    permissionStrings.add(permission);
                }
            }
        }

        return permissionStrings;
    }

    getPermissionsFromPermissionRoleSet(permissionRole: PermissionRole, guildId: string) {
        return new Set(this.getPermissionsFromPermissionRole(permissionRole, guildId));
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

    async sync(guildId?: string) {
        log("Started syncing permission levels", guildId ? `for guild ${guildId}` : "");

        const permissionRoles = await this.client.prisma.permissionRole.findMany({
            where: {
                guild_id: guildId
            }
        });

        for (const permissionRole of permissionRoles) {
            const guildUsesPermissionLevels = this.client.configManager.config[permissionRole.guild_id]?.permissions.mode === "levels";

            for (const roleId of permissionRole.roles) {
                if (guildUsesPermissionLevels && typeof permissionRole.level === "number") {
                    this.guildPermissionLevels[`${permissionRole.guild_id}_r_${roleId}`] = permissionRole.level;
                    continue;
                }

                this.roles[`${permissionRole.guild_id}_${roleId}`] ??= new Map();
                this.roles[`${permissionRole.guild_id}_${roleId}`]!.set(permissionRole.name, permissionRole);
            }

            for (const userId of permissionRole.users) {
                if (guildUsesPermissionLevels && typeof permissionRole.level === "number") {
                    this.guildPermissionLevels[`${permissionRole.guild_id}_u_${userId}`] = permissionRole.level;
                    continue;
                }

                this.users[`${permissionRole.guild_id}_${userId}`] ??= new Map();
                this.users[`${permissionRole.guild_id}_${userId}`]!.set(permissionRole.name, permissionRole);
            }
        }

        log("Completed syncing permission levels", guildId ? `for guild ${guildId}` : "");
    }

    async createPermissionLevel({ guildId, name, permissions, roles, users }: CreatePermissionLevelPayload) {
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

    async deletePermissionLevel({ guildId, name }: Pick<CreatePermissionLevelPayload, "guildId" | "name">) {
        const permissionLevel = await this.client.prisma.permissionRole.findFirst({
            where: {
                name,
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

    async updatePermissionLevel({ guildId, name, permissions, newName, roles, users }: CreatePermissionLevelPayload & { newName?: string }) {
        const existingPermissionLevel = await this.client.prisma.permissionRole.findFirst({
            where: {
                name,
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

                if (this.roles[`${permissionLevel.guild_id}_${roleId}`]!.has(name)) {
                    this.roles[`${permissionLevel.guild_id}_${roleId}`]!.delete(name);
                }

                this.roles[`${permissionLevel.guild_id}_${roleId}`]!.set(permissionLevel.name, permissionLevel);
            }

            for (const userId of permissionLevel.users) {
                this.users[`${permissionLevel.guild_id}_${userId}`] ??= new Map();

                if (this.users[`${permissionLevel.guild_id}_${userId}`]!.has(name)) {
                    this.users[`${permissionLevel.guild_id}_${userId}`]!.delete(name);
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
    name: string;
    permissions: PermissionsString[];
    roles?: Snowflake[];
    users?: Snowflake[];
}
