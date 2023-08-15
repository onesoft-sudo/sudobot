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
import { Client, GuildMember, PermissionsString, Routes, Snowflake } from "discord.js";
import Service from "../core/Service";
import { GatewayEventListener } from "../decorators/GatewayEventListener";
import { HasEventListeners } from "../types/HasEventListeners";
import { safeMemberFetch } from "../utils/fetch";
import { log, logError } from "../utils/logger";

export const name = "reactionRoleService";

export default class ReactionRoleService extends Service implements HasEventListeners {
    readonly reactionRoleEntries = new Map<string, ReactionRole | undefined>();
    readonly usersInProgress = new Set<Snowflake>();

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

        if (this.usersInProgress.has(data.d.user_id)) {
            log("The user has hit a ratelimit.");
            return;
        }

        this.usersInProgress.add(data.d.user_id);
        const { aborted, member, reactionRole } = await this.processRequest(data, data.t === "MESSAGE_REACTION_ADD");

        if (aborted) {
            log("Request aborted");
            setTimeout(() => this.usersInProgress.delete(data.d.user_id), 1500);
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

        setTimeout(() => this.usersInProgress.delete(data.d.user_id), 1500);
    }

    async processRequest(
        data: any,
        permissionChecks = true
    ): Promise<{
        aborted: boolean;
        reactionRole?: ReactionRole;
        member?: GuildMember;
        removedPreviousRoles?: boolean;
    }> {
        const emoji = data.d.emoji;
        const userId = data.d.user_id;
        const messageId = data.d.message_id;
        const channelId = data.d.channel_id;
        const guildId = data.d.guild_id;
        const isReactionAddEvent = data.t === "MESSAGE_REACTION_ADD";

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
                return await this.removeReactionAndAbort(data);
            }

            if (!member.permissions.has("Administrator") && entry.blacklistedUsers.includes(member.user.id)) {
                log("User is blacklisted");
                return await this.removeReactionAndAbort(data);
            }

            if (!member.permissions.has(entry.requiredPermissions as PermissionsString[], true)) {
                log("Member does not have the required permissions");
                return await this.removeReactionAndAbort(data);
            }

            if (usesLevels && entry.level) {
                const level = this.client.permissionManager.getMemberPermissionLevel(member);

                if (level < entry.level) {
                    log("Member does not have the required permission level");
                    return await this.removeReactionAndAbort(data);
                }
            }
        }

        let removedPreviousRoles = false;
        const reactionsToRemove = [];

        if (entry?.single && isReactionAddEvent) {
            for (const value of this.reactionRoleEntries.values()) {
                if (
                    value?.guildId === guildId &&
                    value?.channelId === channelId &&
                    value?.messageId === messageId &&
                    member.roles.cache.hasAny(...value!.roles)
                ) {
                    await member.roles.remove(value!.roles, "Taking out the previous roles").catch(logError);
                    removedPreviousRoles = !removedPreviousRoles ? true : removedPreviousRoles;

                    if (reactionsToRemove.length <= 4) {
                        reactionsToRemove.push(`${value?.emoji}`);
                    }
                }
            }
        }

        if (removedPreviousRoles && reactionsToRemove.length > 0 && reactionsToRemove.length <= 4) {
            log(reactionsToRemove);

            for (const reaction of reactionsToRemove) {
                const isBuiltIn = !/^\d+$/.test(reaction);
                const emoji = !isBuiltIn
                    ? this.client.emojis.cache.find(e => e.id === reaction || e.identifier === reaction)
                    : null;

                if (!isBuiltIn && !emoji) {
                    continue;
                }

                this.removeReactionAndAbort({
                    ...data,
                    d: {
                        ...data.d,
                        emoji: isBuiltIn
                            ? reaction
                            : {
                                  id: emoji!.id,
                                  name: emoji!.name
                              }
                    }
                }).catch(logError);
            }
        }

        return { aborted: false, member, reactionRole: entry, removedPreviousRoles };
    }

    async removeReactionAndAbort(data: any) {
        await this.client.rest
            .delete(
                Routes.channelMessageUserReaction(
                    data.d.channel_id,
                    data.d.message_id,
                    data.d.emoji.id && data.d.emoji.name
                        ? `${data.d.emoji.name}:${data.d.emoji.id}`
                        : encodeURIComponent(data.d.emoji.name),
                    data.d.user_id
                )
            )
            .catch(logError);

        return { aborted: true };
    }

    async createReactionRole({
        channelId,
        messageId,
        guildId,
        emoji,
        roles,
        mode = "MULTIPLE"
    }: {
        channelId: Snowflake;
        messageId: Snowflake;
        guildId: Snowflake;
        emoji: string;
        roles: Snowflake[];
        mode?: "SINGLE" | "MULTIPLE";
    }) {
        const reactionRole = await this.client.prisma.reactionRole.create({
            data: {
                channelId,
                guildId,
                messageId,
                isBuiltInEmoji: !/^\d+$/.test(emoji),
                emoji,
                roles,
                single: mode === "SINGLE"
            }
        });

        this.reactionRoleEntries.set(
            `${reactionRole.guildId}_${reactionRole.channelId}_${reactionRole.messageId}_${reactionRole.emoji}`,
            reactionRole
        );

        return reactionRole;
    }
}
