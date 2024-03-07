/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
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

import { PermissionOverwrite } from "@prisma/client";
import { GuildMember, PermissionsBitField, PermissionsString, Role, Snowflake } from "discord.js";
import { GetMemberPermissionInGuildResult } from "../services/PermissionManager";
import { logInfo } from "../utils/Logger";
import AbstractPermissionManager from "./AbstractPermissionManager";

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

    override isImmuneToAutoMod(member: GuildMember) {
        const { permissions } = this.getMemberPermissions(member);
        return permissions.has("ManageGuild", true);
    }

    // FIXME: This is not implemented yet
    override shouldModerate() {
        return true;
    }

    getMemberPermissions(member: GuildMember, mergeWithDiscordPermissions = true): GetMemberPermissionInGuildResult {
        const overwriteIds = [];
        const baseUserOverwrite = this.cache[`${member.guild.id}_u_${member.user.id}`];
        const permissions = new PermissionsBitField([
            ...(mergeWithDiscordPermissions ? member.permissions.toArray() : []),
            ...((baseUserOverwrite?.grantedPermissions as PermissionsString[]) ?? [])
        ]);
        let highestRoleHavingOverwrite: Role | undefined;
        let highestOverwrite: PermissionOverwrite | undefined;

        if (baseUserOverwrite) {
            overwriteIds.push(baseUserOverwrite.id);
        }

        for (const [roleId, role] of member.roles.cache) {
            const overwrite = this.cache[`${member.guild.id}_r_${roleId}`];

            if (overwrite) {
                overwriteIds.push(overwrite.id);

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
            highestOverwrite,
            overwriteIds
        };
    }
}
