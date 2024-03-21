import { PermissionOverwrite } from "@prisma/client";
import {
    Collection,
    GuildMember,
    PermissionFlagsBits,
    PermissionResolvable,
    Snowflake
} from "discord.js";
import FluentSet from "../framework/collections/FluentSet";
import AbstractPermissionManager from "../framework/permissions/AbstractPermissionManager";
import { SystemPermissionResolvable } from "../framework/permissions/AbstractPermissionManagerService";
import { Permission } from "../framework/permissions/Permission";
import { notIn } from "../framework/utils/utils";

type CachedPermissionOverwrite = Omit<PermissionOverwrite, "grantedSystemPermissions"> & {
    grantedSystemPermissions?: FluentSet<Permission>;
};

// XXX: Not tested yet
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

            for (const roleId of overwrite.users) {
                this.addOverwrite(overwrite.guildId, roleId, overwrite);
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
        const permissions = new FluentSet<Permission>();
        const grantedDiscordPermissions = new FluentSet(...overwrite.grantedDiscordPermissions);

        for (const permission of overwrite.grantedSystemPermissions) {
            const instance = Permission.fromString(permission);

            if (!instance) {
                continue;
            }

            if (instance.canConvertToDiscordPermissions()) {
                grantedDiscordPermissions.add(...instance.toDiscordPermissions());
            } else {
                permissions.add(instance);
            }
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
                    ...acc.grantedDiscordPermissions,
                    ...curr.grantedDiscordPermissions
                ];

                if (curr.grantedSystemPermissions?.size) {
                    acc.grantedSystemPermissions ??= new FluentSet<Permission>();
                    acc.grantedSystemPermissions.add(
                        ...(curr.grantedSystemPermissions?.toArray() ?? [])
                    );
                }

                return acc;
            },
            { ...main }
        );
    }

    private combinePermissions(...overwrites: Array<CachedPermissionOverwrite | undefined | null>) {
        const discordPermissions = [];
        const system = new FluentSet<Permission>();

        for (const overwrite of overwrites) {
            if (!overwrite) {
                continue;
            }

            discordPermissions.push(...overwrite.grantedDiscordPermissions);

            if (overwrite.grantedSystemPermissions?.size) {
                system.combine(overwrite.grantedSystemPermissions);
            }
        }

        const discord = FluentSet.fromArrays<PermissionResolvable>(
            discordPermissions as PermissionResolvable[]
        );

        return {
            discord,
            system
        };
    }

    public getMemberPermissions(member: GuildMember) {
        const globalUserOverwrites = this.overwrites.get(`0:${member.user.id}`);
        const globalEveryoneOverwrites = this.overwrites.get("0:0");
        const memberOverwrites = this.overwrites.get(`${member.guild.id}:${member.user.id}`);
        const { discord: finalDiscordPermissions, system: finalSystemPermissions } =
            this.combinePermissions(
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

        return {
            discord: finalDiscordPermissions,
            system: finalSystemPermissions
        };
    }

    public override async hasPermissions(
        member: GuildMember,
        permissions: SystemPermissionResolvable[]
    ): Promise<boolean> {
        const discordPermissions: PermissionResolvable[] = [];
        const { discord, system } = this.getMemberPermissions(member);

        console.log(system);

        for (const permission of permissions) {
            if (permission instanceof Permission || typeof permission === "function") {
                const instance =
                    typeof permission === "function"
                        ? await permission.getInstance<Permission>()
                        : permission;

                if (!instance.canConvertToDiscordPermissions()) {
                    if (!system.has(instance) && !(await instance.has(member))) {
                        return false;
                    }
                } else {
                    discordPermissions.push(...instance.toDiscordPermissions());
                }
            } else if (
                typeof permission === "string" &&
                notIn(PermissionFlagsBits, permission as keyof typeof PermissionFlagsBits)
            ) {
                const instance = Permission.fromString(permission);

                if (!instance) {
                    this.application.logger.debug(`Permission ${permission} does not exist`);
                    continue;
                }

                if (!instance.canConvertToDiscordPermissions()) {
                    if (!(await instance.has(member))) {
                        return false;
                    }
                } else {
                    discordPermissions.push(...instance.toDiscordPermissions());
                }
            } else {
                discordPermissions.push(permission as PermissionResolvable);
            }
        }

        if (await super.hasPermissions(member, discordPermissions)) {
            return true;
        }

        return discord.hasAll(...discordPermissions);
    }
}

export default LayeredPermissionManager;
