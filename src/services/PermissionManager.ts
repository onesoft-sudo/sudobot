/**
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

import { GuildMember, PermissionFlagsBits, PermissionResolvable } from "discord.js";
import Service from "../core/Service";
import { log } from "../utils/logger";

export const name = "permissionManager";

export default class PermissionManager extends Service {
    shouldModerate(member: GuildMember, moderator: GuildMember) {
        if (this.client.configManager.systemConfig.system_admins.includes(member.user.id)) return true;

        const config = this.client.configManager.config[member.guild.id];

        if (!config) return false;

        if (member.guild.ownerId === member.user.id) return false;
        if (member.guild.ownerId === moderator.user.id) return true;

        const { admin_role, mod_role, staff_role } = config.permissions ?? {};

        if (member.roles.cache.hasAny(admin_role ?? "_", mod_role ?? "_", staff_role ?? "_")) {
            log("Member has roles that are immune to this action");
            return false;
        }

        if (member.permissions.has(PermissionFlagsBits.Administrator)) {
            log("Member has administrator permissions");
            return false;
        }

        if (member.roles.highest.position >= moderator.roles.highest.position) {
            log("Member has higher roles than moderator");
            return false;
        }

        return true;
    }

    isImmuneToAutoMod(member: GuildMember, permission?: PermissionResolvable[] | PermissionResolvable) {
        if (this.client.configManager.systemConfig.system_admins.includes(member.user.id)) return true;

        const config = this.client.configManager.config[member.guild.id];

        if (!config) return true;

        const { admin_role, mod_role, staff_role } = config.permissions ?? {};

        if (member.roles.cache.hasAny(admin_role ?? "_", mod_role ?? "_", staff_role ?? "_")) {
            log("Member has roles that are immune to automod");
            return true;
        }

        return member.permissions.has(PermissionFlagsBits.ManageGuild, true) || (permission && member.permissions.has(permission, true));
    }
}
