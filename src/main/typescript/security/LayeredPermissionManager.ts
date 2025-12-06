import type Application from "@main/core/Application";
import AbstractImplicitPermissionManager from "@framework/permissions/AbstractImplicitPermissionManager";
import type { GetPermissionsResult } from "@framework/permissions/AbstractPermissionManager";
import type { RawPermissionResolvable, SystemPermissionResolvable } from "@framework/permissions/PermissionResolvable";
import type { Snowflake, User } from "discord.js";
import { GuildMember, PermissionsBitField } from "discord.js";
import { LRUCache } from "lru-cache";
import { permissionProfiles } from "@main/models/PermissionProfile";
import { and, eq, or, sql } from "drizzle-orm";
import Permission from "@framework/permissions/Permission";

type LayeredPermissionCache = Omit<GetPermissionsResult, "discordPermissions"> & {
    profiles: Set<string> | null;
    discordPermissions: PermissionsBitField;
};

type GetLayeredPermissionResult = GetPermissionsResult & {
    profiles: Set<string> | null;
};

class LayeredPermissionManager extends AbstractImplicitPermissionManager {
    public override readonly application: Application;

    public constructor(
        application: Application,
        permissions: SystemPermissionResolvable[],
        systemAdminPermission: SystemPermissionResolvable | null
    ) {
        super(application, permissions, systemAdminPermission);
        this.application = application;
    }

    private readonly cache = new LRUCache<`${Snowflake}:${Snowflake}`, LayeredPermissionCache>({
        max: 5000,
        ttl: 1000 * 60 * 30
    });

    private async computePermissions(member: GuildMember, systemPermissions?: Iterable<SystemPermissionResolvable>) {
        const cache = this.cache.get(`${member.guild.id}:${member.id}`);

        if (cache) {
            return cache;
        }

        const entries = await this.application.database.query.permissionProfiles.findMany({
            where: and(
                and(eq(permissionProfiles.guildId, member.guild.id), eq(permissionProfiles.disabled, false)),
                or(
                    sql`${permissionProfiles.users} @> ${[member.id]}`,
                    sql`${permissionProfiles.roles} && ${member.roles.cache.map(role => role.id)}`
                )
            ),
            orderBy: permissionProfiles.priority
        });

        const customPermissions = await this.customPermissionCheck(systemPermissions ?? [], member);
        const profiles = new Set<string>();
        const result: LayeredPermissionCache = {
            grantAll: false,
            profiles,
            customPermissions,
            discordPermissions: new PermissionsBitField(member.permissions)
        };

        for (const entry of entries) {
            profiles.add(entry.name);

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

    public override async getPermissions(
        user: GuildMember | User,
        systemPermissions?: Iterable<SystemPermissionResolvable>
    ): Promise<GetLayeredPermissionResult> {
        if (!(user instanceof GuildMember)) {
            return {
                ...await super.getPermissions(user, systemPermissions),
                profiles: null,
            };
        }

        const cache = await this.computePermissions(user, systemPermissions);

        return {
            ...cache,
            discordPermissions: cache.discordPermissions.bitfield,
        };
    }

    public override async hasPermissions(
        user: GuildMember | User,
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
}

export default LayeredPermissionManager;
