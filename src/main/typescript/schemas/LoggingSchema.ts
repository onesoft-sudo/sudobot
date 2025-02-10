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

import type Duration from "@framework/datetime/Duration";
import type { RuleExecResult } from "@main/contracts/ModerationRuleHandlerContract";
import type { MessageRuleType } from "@main/schemas/MessageRuleSchema";
import type { ModerationActionType } from "@main/schemas/ModerationActionSchema";
import { zSnowflake } from "@main/schemas/SnowflakeSchema";
import type {
    Guild,
    GuildMember,
    GuildTextBasedChannel,
    Message,
    MessageReaction,
    PartialMessage,
    ReadonlyCollection,
    Snowflake,
    User
} from "discord.js";
import { z } from "zod";

export enum LogEventType {
    MessageDelete = "message_delete",
    MessageUpdate = "message_update",
    MessageDeleteBulk = "message_delete_bulk",
    MessageReactionClear = "message_reaction_clear",
    MemberBanAdd = "member_ban_add",
    MemberMassBan = "member_mass_ban",
    MemberMassUnban = "member_mass_unban",
    MemberMassKick = "member_mass_kick",
    MemberBanRemove = "member_ban_remove",
    GuildMemberAdd = "guild_member_add",
    GuildMemberRemove = "guild_member_remove",
    GuildMemberKick = "guild_member_kick",
    MemberMuteAdd = "member_mute_add",
    MemberMuteRemove = "member_mute_remove",
    MemberWarningAdd = "member_warning_add",
    MemberModeratorMessageAdd = "member_mod_message_add",
    UserNoteAdd = "user_note_add",
    MemberRoleModification = "member_role_modification",
    SystemAutoModRuleModeration = "system_automod_rule_moderation",
    SystemUserMessageSave = "system_user_message_save",
    RaidAlert = "raid_alert",
    MemberNicknameModification = "member_nickname_modification",
    GuildVerificationAttempt = "guild_verification_attempt",
    GuildVerificationSuccess = "guild_verification_success",
    GuildVerificationNotEnoughInfo = "guild_verification_not_enough_info"
}

const LogEventSchema = z.enum(
    Object.values({
        ...LogEventType
    }) as unknown as [LogEventType, ...LogEventType[]]
);

export type LogEventArgs = {
    [LogEventType.MessageDelete]: [message: Message<true>, moderator?: User];
    [LogEventType.MessageUpdate]: [oldMessage: Message<true>, newMessage: Message<true>];
    [LogEventType.MessageDeleteBulk]: [payload: LogMessageBulkDeletePayload];
    [LogEventType.MessageReactionClear]: [payload: LogMessageReactionClearPayload];
    [LogEventType.SystemAutoModRuleModeration]: [
        type: "profile" | "message",
        messageOrMember: Message | GuildMember,
        rule: MessageRuleType,
        result: RuleExecResult
    ];
    [LogEventType.MemberMassBan]: [payload: LogMemberMassBanPayload];
    [LogEventType.MemberMassUnban]: [payload: LogMemberMassUnbanPayload];
    [LogEventType.MemberMassKick]: [payload: LogMemberMassKickPayload];
    [LogEventType.MemberBanAdd]: [payload: LogMemberBanAddPayload];
    [LogEventType.MemberBanRemove]: [payload: LogMemberBanRemovePayload];
    [LogEventType.GuildMemberAdd]: [member: GuildMember];
    [LogEventType.GuildMemberRemove]: [member: GuildMember];
    [LogEventType.GuildMemberKick]: [payload: LogMemberKickPayload];
    [LogEventType.MemberMuteAdd]: [payload: LogMemberMuteAddPayload];
    [LogEventType.MemberMuteRemove]: [payload: LogMemberMuteRemovePayload];
    [LogEventType.MemberWarningAdd]: [payload: LogMemberWarningAddPayload];
    [LogEventType.MemberModeratorMessageAdd]: [payload: LogMemberModMessageAddPayload];
    [LogEventType.UserNoteAdd]: [payload: LogUserNoteAddPayload];
    [LogEventType.MemberRoleModification]: [payload: LogMemberRoleModificationPayload];
    [LogEventType.SystemUserMessageSave]: [message: Message, moderator: User];
    [LogEventType.RaidAlert]: [payload: LogRaidAlertPayload];
    [LogEventType.MemberNicknameModification]: [payload: LogMemberNicknameModificationPayload];
    [LogEventType.GuildVerificationAttempt]: [payload: LogGuildVerificationAttemptPayload];
    [LogEventType.GuildVerificationSuccess]: [payload: LogGuildVerificationSuccessPayload];
    [LogEventType.GuildVerificationNotEnoughInfo]: [
        payload: LogGuildVerificationNotEnoughInfoPayload
    ];
};

export type LogGuildVerificationNotEnoughInfoPayload = {
    member: GuildMember;
    ip?: string;
};

export type LogGuildVerificationAttemptPayload = {
    member: GuildMember;
    reason: string;
    altAccountIds?: string[];
    actionsTaken?: ModerationActionType[];
    ip?: string;
    incomplete?: boolean;
};

export type LogGuildVerificationSuccessPayload = {
    member: GuildMember;
    altAccountIds?: string[];
    ip?: string;
    incomplete?: boolean;
};

export type LogMemberNicknameModificationPayload = {
    member: GuildMember;
    oldNickname: string | null;
    newNickname: string | null;
    guild: Guild;
    moderator?: User;
};

export type LogRaidAlertPayload = {
    guild: Guild;
    membersJoined: number;
    duration: number;
    actions: ModerationActionType[];
    serverAction: "none" | "lock" | "lock_and_antijoin" | "antijoin";
};

type LogModerationActionCommonPayload = {
    guild: Guild;
    moderator: User;
    reason?: string;
};

export type LogMemberMassBanPayload = LogModerationActionCommonPayload & {
    users: Array<Snowflake | User>;
    reason?: string;
    duration?: Duration;
    deletionTimeframe?: Duration;
};

export type LogMemberMassUnbanPayload = Omit<
    LogMemberMassBanPayload,
    "duration" | "deletionTimeframe"
>;

export type LogMemberMassKickPayload = Omit<
    LogMemberMassBanPayload,
    "duration" | "deletionTimeframe" | "users"
> & {
    members: Array<Snowflake | GuildMember>;
};

export type LogMemberRoleModificationPayload = Omit<
    LogModerationActionCommonPayload,
    "moderator"
> & {
    member: GuildMember;
    infractionId?: number;
    moderator?: User;
    added?: Snowflake[];
    removed?: Snowflake[];
};

export type LogMemberMuteRemovePayload = LogModerationActionCommonPayload & {
    member: GuildMember;
    infractionId?: number;
};

export type LogMemberMuteAddPayload = LogMemberMuteRemovePayload & {
    duration?: Duration;
};

export type LogMessageBulkDeletePayload = Omit<
    LogModerationActionCommonPayload,
    "moderator" | "guild"
> & {
    messages: ReadonlyCollection<string, Message<boolean> | PartialMessage | undefined>;
    channel: GuildTextBasedChannel;
    moderator?: User;
    infractionId?: number;
    user?: User;
};

export type LogMessageReactionClearPayload = Omit<
    LogModerationActionCommonPayload,
    "moderator" | "guild"
> & {
    reactions: MessageReaction[];
    channel: GuildTextBasedChannel;
    moderator?: User;
    infractionId?: number;
    user?: User;
};

export type LogMemberWarningAddPayload = Omit<LogModerationActionCommonPayload, "guild"> & {
    member: GuildMember;
    infractionId: number;
};

export type LogMemberModMessageAddPayload = LogMemberWarningAddPayload;
export type LogUserNoteAddPayload = LogModerationActionCommonPayload & {
    user: User;
    infractionId: number;
};

export type LogMemberKickPayload = Omit<LogModerationActionCommonPayload, "moderator" | "guild"> & {
    moderator?: User;
    member: GuildMember;
    infractionId?: number;
};

export type LogMemberBanAddPayload = Omit<LogModerationActionCommonPayload, "moderator"> & {
    moderator?: User;
    user: User;
    infractionId?: number;
    duration?: Duration;
    deletionTimeframe?: Duration;
};

export type LogMemberBanRemovePayload = Omit<LogModerationActionCommonPayload, "moderator"> & {
    moderator?: User;
    user: User;
    infractionId?: number;
};

const LogConfigOverride = z
    .object({
        events: z.array(LogEventSchema).nonempty(),
        enabled: z.literal(true),
        channel: zSnowflake
    })
    .or(
        z.object({
            events: z.array(LogEventSchema).nonempty(),
            enabled: z.literal(false)
        })
    );

const LoggingExclusionSchema = z.object({
    type: z.enum(["user", "channel", "category_channel"]),
    mode: z.enum(["exclude", "include"]).default("exclude"),
    snowflakes: z.array(zSnowflake),
    events: z.array(LogEventSchema).optional()
});

export type LoggingExclusionType = z.infer<typeof LoggingExclusionSchema>;

export const LoggingSchema = z.object({
    enabled: z.boolean().default(false),
    bulk_delete_send_json: z.boolean().default(true),
    global_ignored_channels: z.array(zSnowflake).default([]),
    default_enabled: z
        .boolean()
        .default(true)
        .describe("Whether to consider all events as enabled if no override is found"),
    primary_channel: zSnowflake.optional(),
    hooks: z.record(zSnowflake, zSnowflake).default({}),
    overrides: z.array(LogConfigOverride).default([]),
    exclusions: z.array(LoggingExclusionSchema).default([]),
    unsubscribed_events: z.array(LogEventSchema).default([])
});
