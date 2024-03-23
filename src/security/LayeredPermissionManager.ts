import { PermissionOverwrite } from "@prisma/client";
import { Collection, GuildMember, PermissionResolvable, Snowflake } from "discord.js";
import FluentSet from "../framework/collections/FluentSet";
import AbstractPermissionManager, {
    MemberPermissionData
} from "../framework/permissions/AbstractPermissionManager";
import { SystemPermissionLikeString } from "../framework/permissions/AbstractPermissionManagerService";
import { Permission } from "../framework/permissions/Permission";

type CachedPermissionOverwrite = Omit<PermissionOverwrite, "grantedSystemPermissions"> & {
    grantedSystemPermissions?: FluentSet<SystemPermissionLikeString>;
};

/**
 * A permission manager that uses layered permissions overwrites to control access to resources.
 *
 * @since 9.0.0
 */
class LayeredPermissionManager extends AbstractPermissionManager {
    protected readonly overwrites = new Collection<
        `${Snowflake}:${Snowflake}`,
        CachedPermissionOverwrite
    >();

    public override async boot(): Promise<void> {
        this.application.logger.perfStart("overwrites");
        this.overwrites.clear();

        const overwrites = await this.application.prisma.permissionOverwrite.findMany({
            orderBy: {
                guildId: "asc"
            },
            where: {
                disabled: false
            }
        });

        for (const overwrite of overwrites) {
            for (const roleId of overwrite.roles) {
                this.addOverwrite(overwrite.guildId, roleId, overwrite);
            }

            for (const userId of overwrite.users) {
                this.addOverwrite(overwrite.guildId, userId, overwrite);
            }
        }

        this.application.logger.debug("Loaded layered permission overwrites");
        this.application.logger.perfEnd("overwrites", `Processed ${overwrites.length} overwrites`);
    }

    private addOverwrite(guildId: Snowflake, id: Snowflake, permission: PermissionOverwrite) {
        const existing = this.overwrites.get(`${guildId}:${id}`);
        const cachedPermission = this.makeCache(permission);
        const overwrite = this.mergeOverwrites(
            cachedPermission,
            existing && existing.merge && permission.merge && existing.id !== permission.id
                ? existing
                : null
        );

        this.overwrites.set(`${guildId}:${id}`, overwrite);
    }

    private makeCache(overwrite: PermissionOverwrite): CachedPermissionOverwrite {
        const permissions = new FluentSet<SystemPermissionLikeString>();
        const grantedDiscordPermissions = new FluentSet(overwrite.grantedDiscordPermissions);

        for (const permission of overwrite.grantedSystemPermissions) {
            const instance = Permission.fromString(permission);

            if (!instance) {
                continue;
            }

            permissions.add(instance.getName());
        }

        return {
            ...overwrite,
            grantedSystemPermissions: permissions.size ? permissions : undefined,
            grantedDiscordPermissions: grantedDiscordPermissions.toArray()
        };
    }

    private mergeOverwrites(
        main: CachedPermissionOverwrite,
        ...others: (CachedPermissionOverwrite | null | undefined)[]
    ) {
        return others.reduce(
            (acc: CachedPermissionOverwrite, curr) => {
                if (!curr) {
                    return acc;
                }

                acc.roles = [...new Set([...acc.roles, ...curr.roles])];
                acc.users = [...new Set([...acc.users, ...curr.users])];

                acc.grantedDiscordPermissions = [
                    ...new Set([
                        ...acc.grantedDiscordPermissions,
                        ...curr.grantedDiscordPermissions
                    ])
                ];

                if (curr.grantedSystemPermissions?.size) {
                    acc.grantedSystemPermissions ??= new FluentSet<SystemPermissionLikeString>();
                    acc.grantedSystemPermissions.combine(curr.grantedSystemPermissions);
                }

                return acc;
            },
            { ...main }
        );
    }

    private combinePermissions(...overwrites: Array<CachedPermissionOverwrite | undefined | null>) {
        const discordPermissions = new FluentSet<PermissionResolvable>();
        const system = new FluentSet<SystemPermissionLikeString>();

        for (const overwrite of overwrites) {
            if (!overwrite) {
                continue;
            }

            discordPermissions.add(
                ...(overwrite.grantedDiscordPermissions as PermissionResolvable[])
            );

            if (overwrite.grantedSystemPermissions?.size) {
                system.combine(overwrite.grantedSystemPermissions);
            }
        }
        return {
            grantedDiscordPermissions: discordPermissions,
            grantedSystemPermissions: system
        };
    }

    public async getMemberPermissions(member: GuildMember): Promise<MemberPermissionData> {
        const globalUserOverwrites = this.overwrites.get(`0:${member.user.id}`);
        const globalEveryoneOverwrites = this.overwrites.get("0:0");
        const memberOverwrites = this.overwrites.get(`${member.guild.id}:${member.user.id}`);
        const {
            grantedDiscordPermissions: finalDiscordPermissions,
            grantedSystemPermissions: finalSystemPermissions
        } = this.combinePermissions(
            memberOverwrites,
            globalEveryoneOverwrites,
            globalUserOverwrites
        );

        for (const role of member.roles.cache.values()) {
            const roleOverwrites = this.overwrites.get(`${member.guild.id}:${role.id}`);

            if (roleOverwrites) {
                this.application.logger.debug(`Role ${role.name} has overwrites`);

                finalDiscordPermissions.add(
                    ...(roleOverwrites.grantedDiscordPermissions as PermissionResolvable[])
                );

                if (roleOverwrites.grantedSystemPermissions?.size) {
                    finalSystemPermissions.combine(roleOverwrites.grantedSystemPermissions);
                }
            }
        }

        finalDiscordPermissions.add(...member.permissions.toArray());

        const allPermissions = this.application
            .getServiceByName("permissionManager")
            .getAllPermissions()
            .values();

        for (const permission of allPermissions) {
            const name = permission.getName();

            if ((await permission.has(member)) && !finalSystemPermissions.has(name)) {
                finalSystemPermissions.add(name);
            }
        }

        return {
            grantedDiscordPermissions: finalDiscordPermissions,
            grantedSystemPermissions: finalSystemPermissions
        };
    }
}

export default LayeredPermissionManager;
