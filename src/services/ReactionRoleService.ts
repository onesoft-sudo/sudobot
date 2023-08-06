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

import { ReactionRole } from "@prisma/client";
import { Client, PermissionsString } from "discord.js";
import Service from "../core/Service";
import { GatewayEventListener } from "../decorators/GatewayEventListener";
import { HasEventListeners } from "../types/HasEventListeners";
import { log, logError } from "../utils/logger";
import { safeMemberFetch } from "../utils/utils";

export const name = "reactionRoleService";

export default class ReactionRoleService extends Service implements HasEventListeners {
    reactionRoleEntries = new Map<string, ReactionRole | undefined>();

    @GatewayEventListener("ready")
    async onReady(client: Client<true>) {
        log("Syncing reaction roles...");

        const reactionRoles = await this.client.prisma.reactionRole.findMany({
            where: {
                guildId: {
                    in: [...client.guilds.cache.keys()]
                }
            }
        });

        for (const reactionRole of reactionRoles) {
            this.reactionRoleEntries.set(
                `${reactionRole.guildId}_${reactionRole.channelId}_${reactionRole.messageId}_${reactionRole.emoji}`,
                reactionRole
            );
        }

        log("Successfully synced reaction roles");
    }

    @GatewayEventListener("raw")
    async onRaw(data: any) {
        if (data.t !== "MESSAGE_REACTION_ADD" && data.t !== "MESSAGE_REACTION_REMOVE") {
            return;
        }

        log(JSON.stringify(data, null, 2));
        const { aborted, member, reactionRole } = await this.processRequest(data, data.t === "MESSAGE_REACTION_ADD");

        if (aborted) {
            log("Request aborted");
            return;
        }

        try {
            if (data.t === "MESSAGE_REACTION_ADD") {
                await member?.roles.add(reactionRole!.roles, "Adding reaction roles");
            } else {
                await member?.roles.remove(reactionRole!.roles, "Removing reaction roles");
            }
        } catch (e) {
            logError(e);
        }
    }

    async processRequest(data: any, permissionChecks = true) {
        const emoji = data.d.emoji;
        const userId = data.d.user_id;
        const messageId = data.d.message_id;
        const channelId = data.d.channel_id;
        const guildId = data.d.guild_id;

        if (userId === this.client.user?.id) {
            return { aborted: true };
        }

        if (!guildId) {
            return { aborted: true };
        }

        const config = this.client.configManager.config[guildId]?.reaction_roles;
        const usesLevels = this.client.configManager.config[guildId]?.permissions.mode === "levels";

        if (!config?.enabled || (config.ignore_bots && data.d.member?.user?.bot)) {
            return { aborted: true };
        }

        const entry = this.reactionRoleEntries.get(`${guildId}_${channelId}_${messageId!}_${emoji.id ?? emoji.name}`);

        if (!entry) {
            log("Reaction role entry not found, ignoring");
            return { aborted: true };
        }

        if (entry.roles.length === 0) {
            log("No role to add/remove");
            return { aborted: true };
        }

        const guild = this.client.guilds.cache.get(guildId);

        if (!guild) {
            return { aborted: true };
        }

        const member = await safeMemberFetch(guild, userId);

        if (!member) {
            return { aborted: true };
        }

        if (config.ignore_bots && member.user.bot) {
            return { aborted: true };
        }

        if (permissionChecks) {
            if (!member.roles.cache.hasAll(...entry.requiredRoles)) {
                log("Member does not have the required roles");
                return { aborted: true };
            }

            if (!member.permissions.has("Administrator") && entry.blacklistedUsers.includes(member.user.id)) {
                log("User is blacklisted");
                return { aborted: true };
            }

            if (!member.permissions.has(entry.requiredPermissions as PermissionsString[], true)) {
                log("Member does not have the required permissions");
                return { aborted: true };
            }

            if (usesLevels && entry.level) {
                const level = this.client.permissionManager.getMemberPermissionLevel(member);

                if (level < entry.level) {
                    log("Member does not have the required permission level");
                    return { aborted: true };
                }
            }
        }

        return { aborted: false, member, reactionRole: entry };
    }
}
