import { LRUCache } from "lru-cache";
import AbstractImplicitPermissionManager from "@framework/permissions/AbstractImplicitPermissionManager";
import type Application from "@main/core/Application";
import type { RawPermissionResolvable, SystemPermissionResolvable } from "@framework/permissions/PermissionResolvable";
import type { GetPermissionsResult } from "@framework/permissions/AbstractPermissionManager";
import type { APIInteractionGuildMember, Snowflake, User } from "discord.js";
import { PermissionsBitField } from "discord.js";
import { GuildMember } from "discord.js";
import { and, eq, or, sql } from "drizzle-orm";
import { permissionLevels } from "@main/models/PermissionLevel";
import Permission from "@framework/permissions/Permission";

export type GetLeveledPermissionsResult = GetPermissionsResult & {
    level: number;
};

export type GetLeveledPermissionsCache = Omit<GetPermissionsResult, "discordPermissions"> & {
    level: number;
    discordPermissions: PermissionsBitField;
};

class LeveledPermissionManager extends AbstractImplicitPermissionManager {
    public override readonly application: Application;

    public constructor(application: Application, permissions: SystemPermissionResolvable[]) {
        super(application, permissions);
        this.application = application;
    }

    private readonly cache = new LRUCache<`${Snowflake}:${Snowflake}`, GetLeveledPermissionsCache>({
        max: 5000,
        ttl: 1000 * 60 * 30
    });

    public override async getPermissions(
        user: GuildMember | APIInteractionGuildMember | User,
        systemPermissions: Iterable<SystemPermissionResolvable> = this.permissionObjects.values()
    ): Promise<GetLeveledPermissionsResult> {
        if (!(user instanceof GuildMember)) {
            return {
                ...(await super.getPermissions(user, systemPermissions)),
                level: 0
            };
        }

        const cache = await this.computePermissions(user, systemPermissions);

        return {
            discordPermissions: cache.discordPermissions.bitfield,
            grantAll: cache.grantAll,
            level: cache.level,
            customPermissions: cache.customPermissions
        };
    }

    public override async hasPermissions(
        user: GuildMember | APIInteractionGuildMember | User,
        permissions?: RawPermissionResolvable,
        systemPermissions?: Iterable<SystemPermissionResolvable>
    ): Promise<boolean> {
        if (!(user instanceof GuildMember)) {
            return super.hasPermissions(user, permissions, systemPermissions);
        }

        const cache = await this.computePermissions(user, systemPermissions);

        if (permissions && !cache.discordPermissions.has(permissions, true)) {
            return false;
        }

        if (systemPermissions) {
            for (const permission of systemPermissions) {
                if (!cache.customPermissions?.has(Permission.resolve(this.application, permission))) {
                    return false;
                }
            }
        }

        return true;
    }

    public async getLevelOf(member: GuildMember) {
        return (await this.computePermissions(member, [])).level;
    }

    protected async computePermissions(
        member: GuildMember,
        systemPermissions: Iterable<SystemPermissionResolvable> = this.permissionObjects.values()
    ) {
        const cache = this.cache.get(`${member.guild.id}:${member.id}`);

        if (cache) {
            return cache;
        }

        const entries = await this.application.database.query.permissionLevels.findMany({
            where: and(
                and(eq(permissionLevels.guildId, member.guild.id), eq(permissionLevels.disabled, false)),
                or(
                    sql`${permissionLevels.users} @> ${[member.id]}`,
                    sql`${permissionLevels.roles} && ${member.roles.cache.map(role => role.id)}`
                )
            )
        });

        const customPermissions = await this.customPermissionCheck(systemPermissions, member);
        const result: GetLeveledPermissionsCache = {
            grantAll: false,
            level: 0,
            customPermissions,
            discordPermissions: new PermissionsBitField(member.permissions)
        };

        for (const entry of entries) {
            if (result.level < entry.level) {
                result.level = entry.level;
            }

            result.discordPermissions.add(entry.grantedDiscordPermissions);
            result.discordPermissions.remove(entry.deniedDiscordPermissions);

            for (const grantedSystemPermission of entry.grantedSystemPermissions) {
                const permission = this.permissionObjects.get(grantedSystemPermission);

                if (!permission) {
                    continue;
                }

                customPermissions.add(permission);
            }

            for (const deniedSystemPermission of entry.deniedSystemPermissions) {
                const permission = this.permissionObjects.get(deniedSystemPermission);

                if (!permission) {
                    continue;
                }

                customPermissions.delete(permission);
            }
        }

        this.cache.set(`${member.guild.id}:${member.id}`, result);
        return result;
    }
}

export default LeveledPermissionManager;
