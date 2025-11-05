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

import type { ClientEvents } from "discord.js";

export interface HasEventListeners {
    onRaw?(data: unknown): unknown;
    onReady?(...args: ClientEvents["clientReady"]): unknown;

    onMessageCreate?(...args: ClientEvents["messageCreate"]): unknown;
    onMessageUpdate?(...args: ClientEvents["messageUpdate"]): unknown;
    onMessageDelete?(...args: ClientEvents["messageDelete"]): unknown;
    onMessageDeleteBulk?(...args: ClientEvents["messageDeleteBulk"]): unknown;

    onMessageReactionAdd?(...args: ClientEvents["messageReactionAdd"]): unknown;
    onMessageReactionRemove?(...args: ClientEvents["messageReactionRemove"]): unknown;
    onMessageReactionRemoveAll?(...args: ClientEvents["messageReactionRemoveAll"]): unknown;
    onMessageReactionRemoveEmoji?(...args: ClientEvents["messageReactionRemoveEmoji"]): unknown;

    onGuildCreate?(...args: ClientEvents["guildCreate"]): unknown;
    onGuildDelete?(...args: ClientEvents["guildDelete"]): unknown;
    onGuildUpdate?(...args: ClientEvents["guildUpdate"]): unknown;
    onGuildUnavailable?(...args: ClientEvents["guildUnavailable"]): unknown;

    onGuildMemberAdd?(...args: ClientEvents["guildMemberAdd"]): unknown;
    onGuildMemberRemove?(...args: ClientEvents["guildMemberRemove"]): unknown;
    onGuildMemberAvailable?(...args: ClientEvents["guildMemberAvailable"]): unknown;
    onGuildMemberUpdate?(...args: ClientEvents["guildMemberUpdate"]): unknown;
    onGuildMembersChunk?(...args: ClientEvents["guildMembersChunk"]): unknown;

    onGuildBanAdd?(...args: ClientEvents["guildBanAdd"]): unknown;
    onGuildBanRemove?(...args: ClientEvents["guildBanRemove"]): unknown;

    onGuildAuditLogEntryCreate?(...args: ClientEvents["guildAuditLogEntryCreate"]): unknown;

    onGuildIntegrationsUpdate?(...args: ClientEvents["guildIntegrationsUpdate"]): unknown;
    onGuildScheduledEventCreate?(...args: ClientEvents["guildScheduledEventCreate"]): unknown;
    onGuildScheduledEventDelete?(...args: ClientEvents["guildScheduledEventDelete"]): unknown;
    onGuildScheduledEventUpdate?(...args: ClientEvents["guildScheduledEventUpdate"]): unknown;
    onGuildScheduledEventUserAdd?(...args: ClientEvents["guildScheduledEventUserAdd"]): unknown;
    onGuildScheduledEventUserRemove?(...args: ClientEvents["guildScheduledEventUserRemove"]): unknown;

    onChannelCreate?(...args: ClientEvents["channelCreate"]): unknown;
    onChannelDelete?(...args: ClientEvents["channelDelete"]): unknown;
    onChannelPinsUpdate?(...args: ClientEvents["channelPinsUpdate"]): unknown;
    onChannelUpdate?(...args: ClientEvents["channelUpdate"]): unknown;

    onApplicationCommandPermissionsUpdate?(...args: ClientEvents["applicationCommandPermissionsUpdate"]): unknown;

    onAutoModerationActionExecution?(...args: ClientEvents["autoModerationActionExecution"]): unknown;
    onAutoModerationRuleCreate?(...args: ClientEvents["autoModerationRuleCreate"]): unknown;
    onAutoModerationRuleDelete?(...args: ClientEvents["autoModerationRuleDelete"]): unknown;
    onAutoModerationRuleUpdate?(...args: ClientEvents["autoModerationRuleUpdate"]): unknown;

    onCacheSweep?(...args: ClientEvents["cacheSweep"]): unknown;

    onEmojiCreate?(...args: ClientEvents["emojiCreate"]): unknown;
    onEmojiDelete?(...args: ClientEvents["emojiDelete"]): unknown;
    onEmojiUpdate?(...args: ClientEvents["emojiUpdate"]): unknown;

    onError?(...args: ClientEvents["error"]): unknown;
    onWarn?(...args: ClientEvents["warn"]): unknown;
    onDebug?(...args: ClientEvents["debug"]): unknown;

    onInteractionCreate?(...args: ClientEvents["interactionCreate"]): unknown;

    onInvalidated?(...args: ClientEvents["invalidated"]): unknown;

    onInviteCreate?(...args: ClientEvents["inviteCreate"]): unknown;
    onInviteDelete?(...args: ClientEvents["inviteDelete"]): unknown;

    onPresenceUpdate?(...args: ClientEvents["presenceUpdate"]): unknown;

    onRoleCreate?(...args: ClientEvents["roleCreate"]): unknown;
    onRoleDelete?(...args: ClientEvents["roleDelete"]): unknown;
    onRoleUpdate?(...args: ClientEvents["roleUpdate"]): unknown;

    onShardDisconnect?(...args: ClientEvents["shardDisconnect"]): unknown;
    onShardError?(...args: ClientEvents["shardError"]): unknown;
    onShardReady?(...args: ClientEvents["shardReady"]): unknown;
    onShardReconnecting?(...args: ClientEvents["shardReconnecting"]): unknown;
    onShardResume?(...args: ClientEvents["shardResume"]): unknown;

    onStageInstanceCreate?(...args: ClientEvents["stageInstanceCreate"]): unknown;
    onStageInstanceDelete?(...args: ClientEvents["stageInstanceDelete"]): unknown;
    onStageInstanceUpdate?(...args: ClientEvents["stageInstanceUpdate"]): unknown;

    onStickerCreate?(...args: ClientEvents["stickerCreate"]): unknown;
    onStickerDelete?(...args: ClientEvents["stickerDelete"]): unknown;
    onStickerDelete?(...args: ClientEvents["stickerUpdate"]): unknown;

    onThreadCreate?(...args: ClientEvents["threadCreate"]): unknown;
    onThreadDelete?(...args: ClientEvents["threadDelete"]): unknown;
    onThreadListSync?(...args: ClientEvents["threadListSync"]): unknown;
    onThreadMemberUpdate?(...args: ClientEvents["threadMemberUpdate"]): unknown;
    onThreadMembersUpdate?(...args: ClientEvents["threadMembersUpdate"]): unknown;
    onThreadUpdate?(...args: ClientEvents["threadUpdate"]): unknown;

    onTypingStart?(...args: ClientEvents["typingStart"]): unknown;

    onUserUpdate?(...args: ClientEvents["userUpdate"]): unknown;

    onVoiceStateUpdate?(...args: ClientEvents["voiceStateUpdate"]): unknown;

    onWebhooksUpdate?(...args: ClientEvents["webhooksUpdate"]): unknown;
}
