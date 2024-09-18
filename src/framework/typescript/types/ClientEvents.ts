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

import type {
    Channel,
    ClientEvents as DiscordClientEvents,
    Message,
    PartialGroupDMChannel
} from "discord.js";

declare global {
    // FIXME
    interface ClientEvents extends DiscordClientEvents {
        normalMessageCreate: [message: Message];
        normalMessageUpdate: [oldMessage: Message, newMessage: Message];
        normalMessageDelete: [message: Message];
        raw: [data: { t: string; d: unknown }];
    }
}

export type NonPartialGroupDMChannel<Structure extends { channel: Channel }> = Structure & {
    channel: Exclude<Structure["channel"], PartialGroupDMChannel>;
};

enum Events {
    ApplicationCommandPermissionsUpdate = "applicationCommandPermissionsUpdate",
    AutoModerationActionExecution = "autoModerationActionExecution",
    AutoModerationRuleCreate = "autoModerationRuleCreate",
    AutoModerationRuleDelete = "autoModerationRuleDelete",
    AutoModerationRuleUpdate = "autoModerationRuleUpdate",
    CacheSweep = "cacheSweep",
    ChannelCreate = "channelCreate",
    ChannelDelete = "channelDelete",
    ChannelPinsUpdate = "channelPinsUpdate",
    ChannelUpdate = "channelUpdate",
    Debug = "debug",
    EmojiCreate = "emojiCreate",
    EmojiDelete = "emojiDelete",
    EmojiUpdate = "emojiUpdate",
    Error = "error",
    GuildAuditLogEntryCreate = "guildAuditLogEntryCreate",
    GuildAvailable = "guildAvailable",
    GuildBanAdd = "guildBanAdd",
    GuildBanRemove = "guildBanRemove",
    GuildCreate = "guildCreate",
    GuildDelete = "guildDelete",
    GuildIntegrationsUpdate = "guildIntegrationsUpdate",
    GuildMemberAdd = "guildMemberAdd",
    GuildMemberAvailable = "guildMemberAvailable",
    GuildMemberRemove = "guildMemberRemove",
    GuildMemberChunk = "guildMembersChunk",
    GuildMemberUpdate = "guildMemberUpdate",
    GuildScheduledEventCreate = "guildScheduledEventCreate",
    GuildScheduledEventDelete = "guildScheduledEventDelete",
    GuildScheduledEventUpdate = "guildScheduledEventUpdate",
    GuildScheduledEventUserAdd = "guildScheduledEventUserAdd",
    GuildScheduledEventUserRemove = "guildScheduledEventUserRemove",
    GuildUnavailable = "guildUnavailable",
    GuildUpdate = "guildUpdate",
    InteractionCreate = "interactionCreate",
    Invalidated = "invalidated",
    InviteCreate = "inviteCreate",
    InviteDelete = "inviteDelete",
    MessageCreate = "messageCreate",
    MessageDelete = "messageDelete",
    MessageDeleteBulk = "messageDeleteBulk",
    MessageReactionAdd = "messageReactionAdd",
    MessageReactionRemove = "messageReactionRemove",
    MessageReactionRemoveAll = "messageReactionRemoveAll",
    MessageReactionRemoveEmoji = "messageReactionRemoveEmoji",
    MessageUpdate = "messageUpdate",
    PresenceUpdate = "presenceUpdate",
    Ready = "ready",
    RoleCreate = "roleCreate",
    RoleDelete = "roleDelete",
    RoleUpdate = "roleUpdate",
    ShardDisconnect = "shardDisconnect",
    ShardError = "shardError",
    ShardReady = "shardReady",
    ShardReconnecting = "shardReconnecting",
    ShardResume = "shardResume",
    StageInstanceCreate = "stageInstanceCreate",
    StageInstanceDelete = "stageInstanceDelete",
    StageInstanceUpdate = "stageInstanceUpdate",
    StickerCreate = "stickerCreate",
    StickerDelete = "stickerDelete",
    StickerUpdate = "stickerUpdate",
    ThreadCreate = "threadCreate",
    ThreadDelete = "threadDelete",
    ThreadListSync = "threadListSync",
    ThreadMembersUpdate = "threadMembersUpdate",
    ThreadMemberUpdate = "threadMemberUpdate",
    ThreadUpdate = "threadUpdate",
    TypingStart = "typingStart",
    UserUpdate = "userUpdate",
    VoiceStateUpdate = "voiceStateUpdate",
    Warn = "warn",
    WebhooksUpdate = "webhooksUpdate",
    WebhookUpdate = "webhookUpdate",
    Raw = "raw",

    NormalMessageCreate = "normalMessageCreate",
    NormalMessageUpdate = "normalMessageUpdate",
    NormalMessageDelete = "normalMessageDelete"
}

export { ClientEvents, Events };
