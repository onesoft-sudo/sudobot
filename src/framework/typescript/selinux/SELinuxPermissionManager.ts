import AbstractPermissionManager, { type GetPermissionsResult } from "@framework/permissions/AbstractPermissionManager";
import type {
    RawPermissionResolvable,
    SystemPermissionResolvable
} from "@framework/permissions/PermissionResolvable";
import {
    type GuildMember,
    User,
    type GuildBasedChannel,
    type Role,
    PermissionsBitField
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

    public override async hasPermissions(
        user: GuildMember | User,
        permissions: RawPermissionResolvable = 0n,
        systemPermissions?: Iterable<SystemPermissionResolvable>
    ): Promise<boolean> {
        let discordPermissions = user instanceof User ? 0n : this.permissionsCache.get(`u_${user.guild.id}_${user.id}`);

        if (discordPermissions === undefined) {
            if (user instanceof User) {
                discordPermissions = 0n;
            }
            else {
                discordPermissions = await this.computeDiscordPermissions(user);
            }
        }

        const resolvedPermissions =
            typeof permissions === "bigint" ? permissions : new PermissionsBitField(permissions).bitfield;

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
        user: GuildMember | User,
        systemPermissions?: Iterable<SystemPermissionResolvable>
    ): Promise<GetPermissionsResult> {
        const result = await super.getPermissions(user, systemPermissions);
        let discordPermissions = user instanceof User ? 0n : this.permissionsCache.get(`u_${user.guild.id}_${user.id}`);

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

    private async computeDiscordPermissions(member: GuildMember) {
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
        member: GuildMember,
        targetChannel: GuildBasedChannel
    ): Promise<GetPermissionsResult> {
        const discordPermissions = await this.computeDiscordPermissionsOnTarget(member, targetChannel);

        return {
            customPermissions: [],
            discordPermissions,
            grantAll: false
        };
    }

    public override async getPermissionsOnRole(member: GuildMember, targetRole: Role): Promise<GetPermissionsResult> {
        const discordPermissions = await this.computeDiscordPermissionsOnTarget(member, targetRole);

        return {
            customPermissions: [],
            discordPermissions,
            grantAll: false
        };
    }

    public override async getPermissionsOnMember(
        member: GuildMember,
        targetMember: GuildMember
    ): Promise<GetPermissionsResult> {
        const discordPermissions = await this.computeDiscordPermissionsOnTarget(member, targetMember);

        return {
            customPermissions: [],
            discordPermissions,
            grantAll: false
        };
    }

    public override async hasPermissionsOnChannel(
        member: GuildMember,
        targetChannel: GuildBasedChannel,
        permissions: RawPermissionResolvable
    ): Promise<boolean> {
        const discordPermissions = await this.computeDiscordPermissionsOnTarget(member, targetChannel);
        const resolvedPermissions =
            typeof permissions === "bigint" ? permissions : new PermissionsBitField(permissions).bitfield;
        return !!(discordPermissions & resolvedPermissions);
    }

    public override async hasPermissionsOnRole(
        member: GuildMember,
        targetRole: Role,
        permissions: RawPermissionResolvable
    ): Promise<boolean> {
        const discordPermissions = await this.computeDiscordPermissionsOnTarget(member, targetRole);
        const resolvedPermissions =
            typeof permissions === "bigint" ? permissions : new PermissionsBitField(permissions).bitfield;
        return !!(discordPermissions & resolvedPermissions);
    }

    public override async hasPermissionsOnMember(
        member: GuildMember,
        targetMember: GuildMember,
        permissions: RawPermissionResolvable
    ): Promise<boolean> {
        const discordPermissions = await this.computeDiscordPermissionsOnTarget(member, targetMember);
        const resolvedPermissions =
            typeof permissions === "bigint" ? permissions : new PermissionsBitField(permissions).bitfield;
        return !!(discordPermissions & resolvedPermissions);
    }
}

export default SELinuxPermissionManager;
