import type { ClientEvents } from "discord.js";

export interface HasEventListeners {
    onReady?(...args: ClientEvents["ready"]): any;

    onMessageCreate?(...args: ClientEvents["messageCreate"]): any;
    onMessageUpdate?(...args: ClientEvents["messageUpdate"]): any;
    onMessageDelete?(...args: ClientEvents["messageDelete"]): any;
    onMessageDeleteBulk?(...args: ClientEvents["messageDeleteBulk"]): any;

    onMessageReactionAdd?(...args: ClientEvents["messageReactionAdd"]): any;
    onMessageReactionRemove?(...args: ClientEvents["messageReactionRemove"]): any;
    onMessageReactionRemoveAll?(...args: ClientEvents["messageReactionRemoveAll"]): any;
    onMessageReactionRemoveEmoji?(...args: ClientEvents["messageReactionRemoveEmoji"]): any;

    onGuildCreate?(...args: ClientEvents["guildCreate"]): any;
    onGuildDelete?(...args: ClientEvents["guildDelete"]): any;
    onGuildUpdate?(...args: ClientEvents["guildUpdate"]): any;
    onGuildUnavailable?(...args: ClientEvents["guildUnavailable"]): any;

    onGuildMemberAdd?(...args: ClientEvents["guildMemberAdd"]): any;
    onGuildMemberRemove?(...args: ClientEvents["guildMemberRemove"]): any;
    onGuildMemberAvailable?(...args: ClientEvents["guildMemberAvailable"]): any;
    onGuildMemberUpdate?(...args: ClientEvents["guildMemberUpdate"]): any;
    onGuildMembersChunk?(...args: ClientEvents["guildMembersChunk"]): any;

    onGuildBanAdd?(...args: ClientEvents["guildBanAdd"]): any;
    onGuildBanRemove?(...args: ClientEvents["guildBanRemove"]): any;

    onGuildAuditLogEntryCreate?(...args: ClientEvents["guildAuditLogEntryCreate"]): any;

    onGuildIntegrationsUpdate?(...args: ClientEvents["guildIntegrationsUpdate"]): any;
    onGuildScheduledEventCreate?(...args: ClientEvents["guildScheduledEventCreate"]): any;
    onGuildScheduledEventDelete?(...args: ClientEvents["guildScheduledEventDelete"]): any;
    onGuildScheduledEventUpdate?(...args: ClientEvents["guildScheduledEventUpdate"]): any;
    onGuildScheduledEventUserAdd?(...args: ClientEvents["guildScheduledEventUserAdd"]): any;
    onGuildScheduledEventUserRemove?(...args: ClientEvents["guildScheduledEventUserRemove"]): any;

    onChannelCreate?(...args: ClientEvents["channelCreate"]): any;
    onChannelDelete?(...args: ClientEvents["channelDelete"]): any;
    onChannelPinsUpdate?(...args: ClientEvents["channelPinsUpdate"]): any;
    onChannelUpdate?(...args: ClientEvents["channelUpdate"]): any;

    onApplicationCommandPermissionsUpdate?(...args: ClientEvents["applicationCommandPermissionsUpdate"]): any;

    onAutoModerationActionExecution?(...args: ClientEvents["autoModerationActionExecution"]): any;
    onAutoModerationRuleCreate?(...args: ClientEvents["autoModerationRuleCreate"]): any;
    onAutoModerationRuleDelete?(...args: ClientEvents["autoModerationRuleDelete"]): any;
    onAutoModerationRuleUpdate?(...args: ClientEvents["autoModerationRuleUpdate"]): any;

    onCacheSweep?(...args: ClientEvents["cacheSweep"]): any;

    onEmojiCreate?(...args: ClientEvents["emojiCreate"]): any;
    onEmojiDelete?(...args: ClientEvents["emojiDelete"]): any;
    onEmojiUpdate?(...args: ClientEvents["emojiUpdate"]): any;

    onError?(...args: ClientEvents["error"]): any;
    onWarn?(...args: ClientEvents["warn"]): any;
    onDebug?(...args: ClientEvents["debug"]): any;

    onInteractionCreate?(...args: ClientEvents["interactionCreate"]): any;

    onInvalidated?(...args: ClientEvents["invalidated"]): any;

    onInviteCreate?(...args: ClientEvents["inviteCreate"]): any;
    onInviteDelete?(...args: ClientEvents["inviteDelete"]): any;

    onPresenceUpdate?(...args: ClientEvents["presenceUpdate"]): any;

    onRoleCreate?(...args: ClientEvents["roleCreate"]): any;
    onRoleDelete?(...args: ClientEvents["roleDelete"]): any;
    onRoleUpdate?(...args: ClientEvents["roleUpdate"]): any;

    onShardDisconnect?(...args: ClientEvents["shardDisconnect"]): any;
    onShardError?(...args: ClientEvents["shardError"]): any;
    onShardReady?(...args: ClientEvents["shardReady"]): any;
    onShardReconnecting?(...args: ClientEvents["shardReconnecting"]): any;
    onShardResume?(...args: ClientEvents["shardResume"]): any;

    onStageInstanceCreate?(...args: ClientEvents["stageInstanceCreate"]): any;
    onStageInstanceDelete?(...args: ClientEvents["stageInstanceDelete"]): any;
    onStageInstanceUpdate?(...args: ClientEvents["stageInstanceUpdate"]): any;

    onStickerCreate?(...args: ClientEvents["stickerCreate"]): any;
    onStickerDelete?(...args: ClientEvents["stickerDelete"]): any;
    onStickerDelete?(...args: ClientEvents["stickerUpdate"]): any;

    onThreadCreate?(...args: ClientEvents["threadCreate"]): any;
    onThreadDelete?(...args: ClientEvents["threadDelete"]): any;
    onThreadListSync?(...args: ClientEvents["threadListSync"]): any;
    onThreadMemberUpdate?(...args: ClientEvents["threadMemberUpdate"]): any;
    onThreadMembersUpdate?(...args: ClientEvents["threadMembersUpdate"]): any;
    onThreadUpdate?(...args: ClientEvents["threadUpdate"]): any;

    onTypingStart?(...args: ClientEvents["typingStart"]): any;

    onUserUpdate?(...args: ClientEvents["userUpdate"]): any;

    onVoiceStateUpdate?(...args: ClientEvents["voiceStateUpdate"]): any;

    onWebhookUpdate?(...args: ClientEvents["webhookUpdate"]): any;
}
