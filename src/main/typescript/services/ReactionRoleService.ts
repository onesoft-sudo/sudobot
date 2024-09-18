/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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

import { Inject } from "@framework/container/Inject";
import { GatewayEventListener } from "@framework/events/GatewayEventListener";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { HasEventListeners } from "@framework/types/HasEventListeners";
import { ReactionRole, reactionRoles } from "@main/models/ReactionRole";
import LevelBasedPermissionManager from "@main/security/LevelBasedPermissionManager";
import type ConfigurationManager from "@main/services/ConfigurationManager";
import type PermissionManagerService from "@main/services/PermissionManagerService";
import { safeMemberFetch } from "@main/utils/fetch";
import { Client, GuildMember, PermissionsString, Routes, Snowflake } from "discord.js";
import { inArray } from "drizzle-orm";

@Name("reactionRoleService")
class ReactionRoleService extends Service implements HasEventListeners {
    private readonly reactionRoleEntries = new Map<string, ReactionRole | undefined>();
    private readonly users: Record<string, UserRequestInfo> = {};
    private readonly rateLimited = new Map<string, number>();

    @Inject("configManager")
    private readonly configManager!: ConfigurationManager;

    @Inject("permissionManager")
    private readonly permissionManagerService!: PermissionManagerService;

    @GatewayEventListener("ready")
    public async onReady(client: Client<true>) {
        this.application.logger.debug("Syncing reaction roles...");

        const reactionRoleList = await this.application.database.query.reactionRoles.findMany({
            where: inArray(reactionRoles.guildId, [...client.guilds.cache.keys()])
        });

        for (const reactionRole of reactionRoleList) {
            this.reactionRoleEntries.set(
                `${reactionRole.guildId}_${reactionRole.channelId}_${reactionRole.messageId}_${reactionRole.emoji}`,
                reactionRole
            );
        }

        this.application.logger.info("Successfully synced reaction roles");
    }

    public async onRaw(data: RawMessageReactionData) {
        if (data.t !== "MESSAGE_REACTION_ADD" && data.t !== "MESSAGE_REACTION_REMOVE") {
            return;
        }

        if (!this.configManager.config[data.d.guild_id]?.reaction_roles?.enabled) {
            return;
        }

        const config = this.configManager.config[data.d.guild_id]?.reaction_roles?.ratelimiting;

        if (config?.enabled) {
            const rateLimitedAt = this.rateLimited.get(data.d.user_id) ?? 0;

            if (Date.now() - rateLimitedAt < config.block_duration) {
                this.application.logger.debug("The user has hit a ratelimit.");
                return;
            }

            this.rateLimited.delete(data.d.user_id);

            if (!this.users[data.d.user_id]) {
                this.users[data.d.user_id] = {
                    timestamps: []
                };
            }

            const info = this.users[data.d.user_id];

            info.timestamps.push(Date.now());
        }

        const { aborted, member, reactionRole } = await this.processRequest(
            data,
            data.t === "MESSAGE_REACTION_ADD"
        );

        if (aborted) {
            this.application.logger.debug("Request aborted");
            this.setTimeout(data.d.user_id, data.d.guild_id);
            return;
        }

        try {
            if (data.t === "MESSAGE_REACTION_ADD") {
                await member?.roles.add(reactionRole!.roles, "Adding reaction roles");
            } else {
                await member?.roles.remove(reactionRole!.roles, "Removing reaction roles");
            }
        } catch (e) {
            this.application.logger.error(e);
        }

        this.setTimeout(data.d.user_id, data.d.guild_id);
    }

    private setTimeout(userId: string, guildId: string) {
        if (!this.users[userId]) {
            return;
        }

        this.users[userId].timeout ??= setTimeout(() => {
            const config = this.configManager.config[guildId]?.reaction_roles?.ratelimiting;

            if (config?.enabled) {
                const delayedInfo = this.users[userId];
                const timestamps = delayedInfo.timestamps.filter(
                    timestamp => config.timeframe + timestamp >= Date.now()
                );

                if (timestamps.length >= config.max_attempts) {
                    this.rateLimited.set(userId, Date.now());
                }
            }

            delete this.users[userId];
        }, 9000);
    }

    private async processRequest(
        data: RawMessageReactionData,
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

        const config = this.configManager.config[guildId]?.reaction_roles;

        if (!config?.enabled || (config.ignore_bots && data.d.member?.user?.bot)) {
            return { aborted: true };
        }

        const entry = this.reactionRoleEntries.get(
            `${guildId}_${channelId}_${messageId}_${emoji.id ?? emoji.name}`
        );

        if (!entry) {
            this.application.logger.debug("Reaction role entry not found, ignoring");
            return { aborted: true };
        }

        if (entry.roles.length === 0) {
            this.application.logger.debug("No role to add/remove");
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
                this.application.logger.debug("Member does not have the required roles");
                return await this.removeReactionAndAbort(data);
            }

            if (
                !member.permissions.has("Administrator") &&
                entry.blacklistedUsers.includes(member.user.id)
            ) {
                this.application.logger.debug("User is blacklisted");
                return await this.removeReactionAndAbort(data);
            }

            if (!member.permissions.has(entry.requiredPermissions as PermissionsString[], true)) {
                this.application.logger.debug("Member does not have the required permissions");
                return await this.removeReactionAndAbort(data);
            }

            if (entry.level !== null) {
                const manager = await this.permissionManagerService.getManagerForGuild(guildId);

                if (manager instanceof LevelBasedPermissionManager) {
                    const level = await manager.getMemberLevel(member);

                    if (level < entry.level) {
                        this.application.logger.debug(
                            "Member does not have the required permission level"
                        );

                        return await this.removeReactionAndAbort(data);
                    }
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
                    member.roles.cache.hasAny(...value.roles)
                ) {
                    await member.roles
                        .remove(value.roles, "Taking out the previous roles")
                        .catch(this.application.logger.error);
                    removedPreviousRoles = !removedPreviousRoles ? true : removedPreviousRoles;

                    if (reactionsToRemove.length <= 4) {
                        reactionsToRemove.push(`${value?.emoji}`);
                    }
                }
            }
        }

        if (removedPreviousRoles && reactionsToRemove.length > 0 && reactionsToRemove.length <= 4) {
            this.application.logger.debug(reactionsToRemove);

            for (const reaction of reactionsToRemove) {
                const isBuiltIn = !/^\d+$/.test(reaction);
                const emoji = !isBuiltIn
                    ? this.client.emojis.cache.find(
                          e => e.id === reaction || e.identifier === reaction
                      )
                    : null;

                if (!isBuiltIn && !emoji) {
                    continue;
                }

                this.removeReactionAndAbort({
                    ...data,
                    d: {
                        ...data.d,
                        emoji: (isBuiltIn
                            ? reaction
                            : {
                                  id: emoji!.id,
                                  name: emoji!.name
                              }) as RawMessageReactionData["d"]["emoji"]
                    }
                }).catch(this.application.logger.error);
            }
        }

        return { aborted: false, member, reactionRole: entry, removedPreviousRoles };
    }

    private async removeReactionAndAbort(data: RawMessageReactionData) {
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
            .catch(this.application.logger.error);

        return { aborted: true };
    }

    public async createReactionRole({
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
        const [reactionRole] = await this.application.database.drizzle
            .insert(reactionRoles)
            .values({
                channelId,
                guildId,
                messageId,
                isBuiltInEmoji: !/^\d+$/.test(emoji),
                emoji,
                roles,
                single: mode === "SINGLE"
            })
            .returning();

        this.reactionRoleEntries.set(
            `${reactionRole.guildId}_${reactionRole.channelId}_${reactionRole.messageId}_${reactionRole.emoji}`,
            reactionRole
        );

        return reactionRole;
    }
}

interface UserRequestInfo {
    timestamps: number[];
    timeout?: Timer;
}

export type RawMessageReactionData = {
    t: "MESSAGE_REACTION_ADD" | "MESSAGE_REACTION_REMOVE";
    d: {
        user_id: string;
        message_id: string;
        channel_id: string;
        guild_id: string;
        emoji: {
            name: string;
            id?: string;
        };
        member?: {
            user: {
                bot: boolean;
            };
        };
    };
};

export default ReactionRoleService;
