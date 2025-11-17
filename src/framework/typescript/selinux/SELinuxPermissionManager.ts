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

import AbstractPermissionManager, { type GetPermissionsResult } from "@framework/permissions/AbstractPermissionManager";
import type { RawPermissionResolvable, SystemPermissionResolvable } from "@framework/permissions/PermissionResolvable";
import type { APIInteractionGuildMember } from "discord.js";
import {
    User,
    type GuildBasedChannel,
    type Role,
    GuildMember,
    PermissionsBitField,
    PermissionFlagsBits
} from "discord.js";
import PolicyManagerAVC from "./PolicyManagerAVC";
import { LRUCache } from "lru-cache";
import Permission from "@framework/permissions/Permission";

class SELinuxPermissionManager extends AbstractPermissionManager {
    protected readonly policyManager = new PolicyManagerAVC();
    protected readonly permissionsCache = new LRUCache<string, bigint>({
        max: 20_000,
        ttl: 1000 * 60 * 10
    });

    public async canBypass(user: GuildMember | APIInteractionGuildMember | User): Promise<boolean> {
        for (const permission of Permission.globalBypassPermissions) {
            if (!(await permission.has(user))) {
                return false;
            }
        }

        return true;
    }

    public override async hasPermissions(
        user: GuildMember | APIInteractionGuildMember | User,
        permissions: RawPermissionResolvable = 0n,
        systemPermissions?: Iterable<SystemPermissionResolvable>
    ): Promise<boolean> {
        const resolvedPermissions =
            typeof permissions === "bigint" ? permissions : new PermissionsBitField(permissions).bitfield;

        if (resolvedPermissions === 0n) {
            return true;
        }

        if (await this.canBypass(user)) {
            return true;
        }

        let discordPermissions =
            user instanceof GuildMember ? this.permissionsCache.get(`u_${user.guild.id}_${user.id}`) : 0n;

        if (discordPermissions === undefined) {
            if (user instanceof User) {
                discordPermissions = 0n;
            }
            else {
                discordPermissions = await this.computeDiscordPermissions(user);
            }
        }

        if (!(discordPermissions & resolvedPermissions)) {
            return false;
        }

        if (systemPermissions) {
            for (const permissionClass of systemPermissions) {
                const instance = Permission.resolve(this.application, permissionClass);

                if (!(await instance.has(user))) {
                    return false;
                }
            }
        }

        return true;
    }

    public override async getPermissions(
        user: GuildMember | APIInteractionGuildMember | User,
        systemPermissions?: Iterable<SystemPermissionResolvable>
    ): Promise<GetPermissionsResult> {
        if (await this.canBypass(user)) {
            const customPermissions = [...Permission.globalBypassPermissions];

            if (systemPermissions) {
                for (const permission of systemPermissions) {
                    customPermissions.push(Permission.resolve(this.application, permission));
                }
            }

            return {
                discordPermissions: PermissionsBitField.All,
                grantAll: true,
                customPermissions
            };
        }

        const result = await super.getPermissions(user, systemPermissions);
        let discordPermissions =
            user instanceof GuildMember ? this.permissionsCache.get(`u_${user.guild.id}_${user.id}`) : 0n;

        if (discordPermissions === undefined) {
            if (user instanceof User) {
                discordPermissions = 0n;
            }
            else {
                discordPermissions = await this.computeDiscordPermissions(user);
            }
        }

        result.discordPermissions = discordPermissions;
        return result;
    }

    private async computeDiscordPermissions(member: GuildMember | APIInteractionGuildMember) {
        if (!("guild" in member)) {
            return 0n;
        }

        const typeId = await this.policyManager.getContextOf(member.guild.id, member);
        const discordPermissions = await this.policyManager.getPermissionsOf(member.guild.id, typeId);
        this.permissionsCache.set(`u_${member.guild.id}_${member.id}`, discordPermissions);
        return discordPermissions;
    }

    private async computeDiscordPermissionsOnTarget(
        member: GuildMember,
        target: Role | GuildMember | GuildBasedChannel
    ) {
        const key = `t_${member.guild.id}_${member.id}_${this.policyManager.getTypePrefixOf(target)}_${target.id}`;
        const existing = this.permissionsCache.get(key);

        if (existing !== undefined) {
            return existing;
        }

        const subjectTypeId = await this.policyManager.getContextOf(member.guild.id, member);
        const targetTypeId = await this.policyManager.getContextOf(member.guild.id, target);
        const discordPermissions = await this.policyManager.getPermissionsOfWithTarget(
            member.guild.id,
            subjectTypeId,
            targetTypeId
        );

        this.permissionsCache.set(key, discordPermissions);
        return discordPermissions;
    }

    public override async getPermissionsOnChannel(
        member: GuildMember | APIInteractionGuildMember,
        targetChannel: GuildBasedChannel
    ): Promise<GetPermissionsResult> {
        if (await this.canBypass(member)) {
            return {
                discordPermissions: PermissionsBitField.All,
                grantAll: true,
                customPermissions: [...Permission.globalBypassPermissions]
            };
        }

        if (!("guild" in member)) {
            return {
                customPermissions: [],
                discordPermissions: 0n,
                grantAll: false
            };
        }

        const discordPermissions = await this.computeDiscordPermissionsOnTarget(member, targetChannel);

        return {
            customPermissions: [],
            discordPermissions,
            grantAll: false
        };
    }

    public override async getPermissionsOnRole(
        member: GuildMember | APIInteractionGuildMember,
        targetRole: Role
    ): Promise<GetPermissionsResult> {
        if (await this.canBypass(member)) {
            return {
                discordPermissions: PermissionsBitField.All,
                grantAll: true,
                customPermissions: [...Permission.globalBypassPermissions]
            };
        }

        if (!("guild" in member)) {
            return {
                customPermissions: [],
                discordPermissions: 0n,
                grantAll: false
            };
        }

        const discordPermissions = await this.computeDiscordPermissionsOnTarget(member, targetRole);

        return {
            customPermissions: [],
            discordPermissions,
            grantAll: false
        };
    }

    public override async getPermissionsOnMember(
        member: GuildMember | APIInteractionGuildMember,
        targetMember: GuildMember | APIInteractionGuildMember
    ): Promise<GetPermissionsResult> {
        const memberCanBypass = await this.canBypass(member);
        const targetCanBypass = await this.canBypass(targetMember);

        if (memberCanBypass && !targetCanBypass) {
            return {
                discordPermissions: PermissionsBitField.All,
                grantAll: true,
                customPermissions: [...Permission.globalBypassPermissions]
            };
        }

        if ((memberCanBypass && targetCanBypass) || !("guild" in member) || !("guild" in targetMember)) {
            return {
                customPermissions: [],
                discordPermissions: 0n,
                grantAll: false
            };
        }

        const discordPermissions = await this.computeDiscordPermissionsOnTarget(member, targetMember);

        return {
            customPermissions: [],
            discordPermissions,
            grantAll: false
        };
    }

    public override async hasPermissionsOnChannel(
        member: GuildMember | APIInteractionGuildMember,
        targetChannel: GuildBasedChannel,
        permissions: RawPermissionResolvable
    ): Promise<boolean> {
        if (await this.canBypass(member)) {
            return false;
        }

        if (!("guild" in member)) {
            return false;
        }

        const resolvedPermissions =
            typeof permissions === "bigint" ? permissions : new PermissionsBitField(permissions).bitfield;

        if (resolvedPermissions === 0n) {
            return true;
        }

        const discordPermissions = await this.computeDiscordPermissionsOnTarget(member, targetChannel);
        return !!(discordPermissions & resolvedPermissions);
    }

    public override async hasPermissionsOnRole(
        member: GuildMember | APIInteractionGuildMember,
        targetRole: Role,
        permissions: RawPermissionResolvable
    ): Promise<boolean> {
        if (await this.canBypass(member)) {
            return false;
        }

        if (!("guild" in member)) {
            return false;
        }

        const resolvedPermissions =
            typeof permissions === "bigint" ? permissions : new PermissionsBitField(permissions).bitfield;

        if (resolvedPermissions === 0n) {
            return true;
        }

        const discordPermissions = await this.computeDiscordPermissionsOnTarget(member, targetRole);
        return !!(discordPermissions & resolvedPermissions);
    }

    public override async hasPermissionsOnMember(
        member: GuildMember | APIInteractionGuildMember,
        targetMember: GuildMember | APIInteractionGuildMember,
        permissions: RawPermissionResolvable
    ): Promise<boolean> {
        const memberCanBypass = await this.canBypass(member);
        const targetCanBypass = await this.canBypass(targetMember);

        if (memberCanBypass && !targetCanBypass) {
            return false;
        }

        if ((memberCanBypass && targetCanBypass) || !("guild" in member) || !("guild" in targetMember)) {
            return false;
        }

        const resolvedPermissions =
            typeof permissions === "bigint" ? permissions : new PermissionsBitField(permissions).bitfield;

        if (resolvedPermissions === 0n) {
            return true;
        }

        const discordPermissions = await this.computeDiscordPermissionsOnTarget(member, targetMember);
        return !!(discordPermissions & resolvedPermissions);
    }
}

export default SELinuxPermissionManager;
