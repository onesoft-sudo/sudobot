import { PermissionOverwrite } from "@prisma/client";
import { GuildMember, PermissionsBitField, PermissionsString, Role, Snowflake } from "discord.js";
import { GetMemberPermissionInGuildResult } from "../services/PermissionManager";
import AbstractPermissionManager from "./AbstractPermissionManager";
import { logInfo } from "./logger";

export default class LayerBasedPermissionManager extends AbstractPermissionManager {
    protected cache: Record<`${Snowflake}_${"r" | "u"}_${Snowflake}`, PermissionOverwrite> = {};

    async sync() {
        const overwrites = await this.client.prisma.permissionOverwrite.findMany();

        this.cache = {};

        for (const overwrite of overwrites) {
            for (const roleId of overwrite.roles) {
                this.cache[`${overwrite.guildId}_r_${roleId}`] = overwrite;
            }

            for (const userId of overwrite.users) {
                this.cache[`${overwrite.guildId}_u_${userId}`] = overwrite;
            }
        }

        logInfo(`[${this.constructor.name}] Synchronized permission overwrites`);
    }

    isImmuneToAutoMod(member: GuildMember) {
        const { permissions } = this.getMemberPermissions(member);
        return permissions.has("ManageGuild", true);
    }

    // FIXME: This is not implemented yet
    shouldModerate(member: GuildMember, moderator: GuildMember) {
        return false;
    }

    getMemberPermissions(member: GuildMember, mergeWithDiscordPermissions = true): GetMemberPermissionInGuildResult {
        const baseUserOverwrite = this.cache[`${member.guild.id}_u_${member.user.id}`];
        const permissions = new PermissionsBitField([
            ...(mergeWithDiscordPermissions ? member.permissions.toArray() : []),
            ...((baseUserOverwrite?.grantedPermissions as PermissionsString[]) ?? [])
        ]);
        let highestRoleHavingOverwrite: Role | undefined;
        let highestOverwrite: PermissionOverwrite | undefined;

        for (const [roleId, role] of member.roles.cache) {
            const overwrite = this.cache[`${member.guild.id}_r_${roleId}`];

            if (overwrite) {
                for (const permission of overwrite.grantedPermissions) {
                    permissions.add(permission as PermissionsString);
                }

                if (role.position > (highestRoleHavingOverwrite?.position ?? 0)) {
                    highestRoleHavingOverwrite = role;
                    highestOverwrite = overwrite;
                }
            }
        }

        return {
            type: "layered",
            permissions,
            highestRoleHavingOverwrite,
            highestOverwrite
        };
    }
}
