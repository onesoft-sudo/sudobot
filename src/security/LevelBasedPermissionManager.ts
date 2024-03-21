import { PermissionLevel } from "@prisma/client";
import { Collection, GuildMember, PermissionResolvable, Snowflake } from "discord.js";
import FluentSet from "../framework/collections/FluentSet";
import AbstractPermissionManager, {
    MemberPermissionData
} from "../framework/permissions/AbstractPermissionManager";
import { Permission } from "../framework/permissions/Permission";

type MinimalPermissionLevelInfo = {
    level: number;
    grantedDiscordPermissions: FluentSet<PermissionResolvable>;
    grantedSystemPermissions: FluentSet<Permission>;
};

/**
 * A permission manager that uses permission levels to control access to resources.
 *
 * @since 9.0.0
 */
class LevelBasedPermissionManager extends AbstractPermissionManager {
    protected readonly levels = new Collection<
        `${Snowflake}:${Snowflake}`,
        MinimalPermissionLevelInfo
    >();

    public override async boot(): Promise<void> {
        this.levels.clear();

        const levels = await this.application.prisma.permissionLevel.findMany({
            where: {
                disabled: false
            }
        });

        for (const level of levels) {
            const info = this.makeCache(level);

            for (const id of [...level.users, ...level.roles]) {
                const key = `${level.guildId}:${id}` as const;
                const existing = this.levels.get(key);
                const minimalLevelInfo = existing ? this.mergeLevels(existing, info) : info;
                this.levels.set(key, minimalLevelInfo);
            }
        }

        this.application.logger.info(`Loaded ${this.levels.size} permission levels.`);
    }

    private mergeLevels(
        ...levels: Array<MinimalPermissionLevelInfo | undefined | null>
    ): MinimalPermissionLevelInfo {
        const grantedDiscordPermissions = new FluentSet<PermissionResolvable>();
        const grantedSystemPermissions = new FluentSet<Permission>();
        let level = 0;

        for (const newLevel of levels) {
            if (!newLevel) {
                continue;
            }

            grantedDiscordPermissions.add(...newLevel.grantedDiscordPermissions);
            grantedSystemPermissions.add(...newLevel.grantedSystemPermissions);
            level = Math.max(level, newLevel.level);
        }

        return {
            grantedDiscordPermissions,
            grantedSystemPermissions,
            level
        } satisfies MinimalPermissionLevelInfo;
    }

    private makeCache(level: PermissionLevel) {
        const grantedSystemPermissions = new FluentSet<Permission>();
        const grantedDiscordPermissions = new FluentSet<PermissionResolvable>(
            level.grantedDiscordPermissions as PermissionResolvable[]
        );

        for (const permission of level.grantedSystemPermissions) {
            const instance = Permission.fromString(permission);

            if (!instance) {
                this.application.logger.warn(`Permission ${permission} does not exist.`);
                continue;
            }

            if (instance.canConvertToDiscordPermissions()) {
                grantedDiscordPermissions.add(...instance.toDiscordPermissions());
            } else {
                grantedSystemPermissions.add(instance);
            }
        }

        const info = {
            level: level.level,
            grantedDiscordPermissions,
            grantedSystemPermissions
        } satisfies MinimalPermissionLevelInfo;

        return info;
    }

    public override async getMemberPermissions(member: GuildMember): Promise<
        MemberPermissionData & {
            level: number;
        }
    > {
        const globalUserLevel = this.levels.get(`0:${member.user.id}`);
        const globalEveryoneLevel = this.levels.get("0:0");
        const memberLevel = this.levels.get(`${member.guild.id}:${member.user.id}`);
        const levelsToMerge = [memberLevel, globalEveryoneLevel, globalUserLevel];

        for (const role of member.roles.cache.values()) {
            const roleLevel = this.levels.get(`${member.guild.id}:${role.id}`);

            if (!roleLevel) {
                continue;
            }

            levelsToMerge.push(roleLevel);
        }

        const merged = this.mergeLevels(...levelsToMerge);
        merged.grantedDiscordPermissions.add(...member.permissions.toArray());
        return merged;
    }
}

export default LevelBasedPermissionManager;
