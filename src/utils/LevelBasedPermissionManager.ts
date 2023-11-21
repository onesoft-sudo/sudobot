import { PermissionLevel } from "@prisma/client";
import { GuildMember, PermissionsBitField, PermissionsString, Snowflake } from "discord.js";
import { GetMemberPermissionInGuildResult } from "../services/PermissionManager";
import AbstractPermissionManager from "./AbstractPermissionManager";
import { log, logInfo } from "./logger";
import { isSystemAdmin } from "./utils";

export default class LevelBasedPermissionManager extends AbstractPermissionManager {
    protected cache: Record<`${Snowflake}_${"r" | "u"}_${Snowflake}`, PermissionLevel> = {};

    async sync() {
        const levels = await this.client.prisma.permissionLevel.findMany();

        this.cache = {};

        for (const level of levels) {
            for (const roleId of level.roles) {
                this.cache[`${level.guildId}_r_${roleId}`] = level;
            }

            for (const userId of level.users) {
                this.cache[`${level.guildId}_u_${userId}`] = level;
            }
        }

        logInfo(`[${this.constructor.name}] Synchronized permission levels`);
    }

    shouldModerate(member: GuildMember, moderator: GuildMember) {
        const memberLevel = this.getPermissionLevel(member);
        const moderatorLevel = this.getPermissionLevel(moderator);

        if (memberLevel >= moderatorLevel) {
            log("Member has higher/equal permission level than moderator");
            return false;
        }

        return true;
    }

    /**
     * TODO: Introduce a configuration option that allows to specify a permission level that is immune to automod
     */
    isImmuneToAutoMod(member: GuildMember) {
        const level = this.getPermissionLevel(member);
        return level === 100;
    }

    protected getMemberPermissionsFromHighestLevel(member: GuildMember, level: number) {
        const permissions = new PermissionsBitField();

        for (const key in this.cache) {
            if (!key.startsWith(`${member.guild.id}_r`)) {
                continue;
            }

            const entry = this.cache[key as keyof typeof this.cache];

            if (entry.level > level) {
                continue;
            }

            for (const permission of entry.grantedPermissions) {
                permissions.add(permission as PermissionsString);
            }
        }

        return permissions;
    }

    getPermissionLevel(member: GuildMember) {
        if (member.guild.ownerId === member.user.id || isSystemAdmin(this.client, member.user.id)) {
            return 100;
        }

        let level = this.cache[`${member.guild.id}_u_${member.id}`]?.level ?? 0;

        for (const roleId of member.roles.cache.keys()) {
            if (this.cache[`${member.guild.id}_r_${roleId}`]) {
                if (level < this.cache[`${member.guild.id}_r_${roleId}`].level) {
                    level = this.cache[`${member.guild.id}_r_${roleId}`].level;
                }
            }
        }

        return level;
    }

    getMemberPermissions(member: GuildMember, mergeWithDiscordPermissions = true): GetMemberPermissionInGuildResult {
        const level = this.getPermissionLevel(member);
        const permissions = this.getMemberPermissionsFromHighestLevel(member, level);

        if (mergeWithDiscordPermissions) {
            for (const permission of member.permissions.toArray()) {
                permissions.add(permission);
            }
        }

        for (const permission of this.cache[`${member.guild.id}_u_${member.id}`]?.grantedPermissions ?? []) {
            permissions.add(permission as PermissionsString);
        }

        return {
            type: "levels",
            permissions,
            level
        };
    }
}
