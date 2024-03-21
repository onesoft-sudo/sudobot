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
        this.overwrites.clear();

        const overwrites = await this.application.prisma.permissionOverwrite.findMany({
            orderBy: {
                priority: "asc"
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
    }

    private addOverwrite(guildId: Snowflake, id: Snowflake, permission: PermissionOverwrite) {
        const existing = this.overwrites.get(`${guildId}:${id}`);

        this.overwrites.set(
            `${guildId}:${id}`,
            existing && existing.merge && permission.merge && existing.id !== permission.id
                ? this.mergeOverwrites(existing, this.makeCache(permission))
                : this.makeCache(permission)
        );
    }

    private makeCache(overwrite: PermissionOverwrite): CachedPermissionOverwrite {
        const permissions = new FluentSet<Permission>();

        for (const permission of overwrite.grantedSystemPermissions) {
            const instance = Permission.fromString(permission);

            if (instance) {
                permissions.add(instance);
            }
        }

        return {
            ...overwrite,
            grantedSystemPermissions: permissions.size ? permissions : undefined
        };
    }

    private mergeOverwrites(
        main: CachedPermissionOverwrite,
        ...others: CachedPermissionOverwrite[]
    ) {
        return others.reduce(
            (acc, curr) => {
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

    public getMemberPermissions(member: GuildMember) {
        const memberOverwrites = this.overwrites.get(`${member.guild.id}:${member.user.id}`);
        const finalDiscordPermissions = new FluentSet<PermissionResolvable>(
            (memberOverwrites?.grantedDiscordPermissions as
                | PermissionResolvable[]
                | undefined
                | null) ?? undefined
        );
        const finalSystemPermissions = new FluentSet<SystemPermissionResolvable>(
            (memberOverwrites?.grantedSystemPermissions as Permission[] | undefined | null) ??
                undefined
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

        for (const permission of permissions) {
            if (permission instanceof Permission || typeof permission === "function") {
                const instance =
                    typeof permission === "function"
                        ? await permission.getInstance<Permission>()
                        : permission;

                if (!instance.canConvertToDiscordPermissions()) {
                    if (!(await instance.has(member))) {
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

        const { discord } = this.getMemberPermissions(member);
        return discord.hasAll(...discordPermissions);
    }
}

export default LayeredPermissionManager;
