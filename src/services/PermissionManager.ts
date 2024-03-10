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

import { PermissionOverwrite } from "@prisma/client";
import {
    GuildMember,
    PermissionFlagsBits,
    PermissionResolvable,
    PermissionsBitField,
    Role,
    Snowflake
} from "discord.js";
import Service from "../core/Service";
import AbstractPermissionManager from "../security/AbstractPermissionManager";
import DiscordBasedPermissionManager from "../security/DiscordBasedPermissionManager";
import LayerBasedPermissionManager from "../security/LayerBasedPermissionManager";
import LevelBasedPermissionManager from "../security/LevelBasedPermissionManager";
import { log, logInfo } from "../utils/Logger";
import { GuildConfig } from "./ConfigManager";

export const name = "permissionManager";

export type GetMemberPermissionInGuildResult = {
    permissions: PermissionsBitField;
} & (
    | {
          type: "levels";
          level: number;
      }
    | {
          type: "discord";
      }
    | {
          type: "layered";
          highestOverwrite?: PermissionOverwrite;
          highestRoleHavingOverwrite?: Role;
          overwriteIds: number[];
      }
);

export default class PermissionManager<
    M extends AbstractPermissionManager = AbstractPermissionManager
> extends Service {
    protected readonly cache: Record<`${Snowflake}_${Snowflake}`, object> = {};
    protected readonly managers: Record<
        NonNullable<GuildConfig["permissions"]["mode"]>,
        AbstractPermissionManager | undefined
    > = {
        layered: new LayerBasedPermissionManager(this.client),
        discord: new DiscordBasedPermissionManager(this.client),
        levels: new LevelBasedPermissionManager(this.client)
    };

    boot() {
        if (!this.client.configManager.systemConfig.sync_permission_managers_on_boot) {
            return;
        }

        for (const managerName in this.managers) {
            this.managers[managerName as keyof typeof this.managers]?.sync?.();
            logInfo(`[${this.constructor.name}] Synchronizing ${managerName} permission manager`);
        }
    }

    async isImmuneToAutoMod(
        member: GuildMember,
        permission?: PermissionResolvable[] | PermissionResolvable
    ) {
        if (this.client.configManager.systemConfig.system_admins.includes(member.user.id))
            return true;

        const config = this.client.configManager.config[member.guild.id];

        if (!config) return true;

        const { admin_role, mod_role, staff_role, check_discord_permissions, invincible_roles } =
            config.permissions ?? {};

        if (member.roles.cache.hasAny(admin_role ?? "_", mod_role ?? "_", staff_role ?? "_")) {
            log("Member has roles that are immune to automod");
            return true;
        }

        for (const roleId of invincible_roles) {
            if (member.roles.cache.has(roleId)) {
                log("Member has roles that are immune to this action");
                return true;
            }
        }

        if (check_discord_permissions === "automod" || check_discord_permissions === "both") {
            const hasDiscordPerms =
                member.permissions.has(PermissionFlagsBits.ManageGuild, true) ||
                (permission && member.permissions.has(permission, true));

            if (hasDiscordPerms) {
                log("Member has discord permissions that are immune to automod");
                return true;
            }
        }

        const manager = await this.getManager(member.guild.id);
        const { permissions } = manager.getMemberPermissions(member);
        const hasPermissions = permissions.has("Administrator") || permissions.has("ManageGuild");

        if (hasPermissions) {
            log("Member has permissions that are immune to automod");
            return true;
        }

        return manager.isImmuneToAutoMod(member, permission);
    }

    // FIXME: Move these permission checks to DiscordBasedPermissionManager
    async shouldModerate(member: GuildMember, moderator: GuildMember) {
        if (this.client.configManager.systemConfig.system_admins.includes(moderator.user.id))
            return true;

        const config = this.client.configManager.config[member.guild.id];

        if (!config) return false;

        if (member.guild.ownerId === member.user.id) return false;
        if (member.guild.ownerId === moderator.user.id) return true;

        const { admin_role, mod_role, staff_role, invincible_roles, check_discord_permissions } =
            config.permissions ?? {};

        if (member.roles.cache.hasAny(admin_role ?? "_", mod_role ?? "_", staff_role ?? "_")) {
            log("Member has roles that are immune to this action");
            return false;
        }

        for (const roleId of invincible_roles) {
            if (member.roles.cache.has(roleId)) {
                log("Member has roles that are immune to this action");
                return false;
            }
        }

        if (
            (check_discord_permissions === "manual_actions" ||
                check_discord_permissions === "both") &&
            member.roles.highest.position >= moderator.roles.highest.position
        ) {
            log("Member has higher/equal roles than moderator");
            return false;
        }

        const manager = await this.getManager(member.guild.id);
        return await manager.shouldModerate(member, moderator);
    }

    protected getMode(guildId: string) {
        return this.client.configManager.config[guildId]?.permissions.mode ?? "discord";
    }

    async getManager(guildId: string): Promise<M> {
        const manager = this.managers[this.getMode(guildId)];

        if (!manager) {
            throw new Error("Unknown/Unsupported permission mode: " + this.getMode(guildId));
        }

        await manager.triggerSyncIfNeeded();
        return manager as M;
    }

    async getMemberPermissions(member: GuildMember, mergeWithDiscordPermissions?: boolean) {
        const manager = await this.getManager(member.guild.id);
        return manager.getMemberPermissions(member, mergeWithDiscordPermissions);
    }

    usesLayeredMode(guildId: string) {
        return this.getMode(guildId) === "layered";
    }

    usesLevelBasedMode(guildId: string): this is PermissionManager<LevelBasedPermissionManager> {
        return this.getMode(guildId) === "levels";
    }

    usesDiscordMode(guildId: string) {
        return this.getMode(guildId) === "discord";
    }
}
