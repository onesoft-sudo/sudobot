/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025, 2026 OSN Developers.
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
import type { RuleExecResult } from "@main/moderation/RuleManager";
import type { LogEventType } from "@schemas/defs/LoggingSchema";
import type { ModerationActionType } from "@schemas/defs/ModerationActionSchema";
import type { RuleDefinition } from "@schemas/defs/RuleSchema";
import type {
    Guild,
    GuildBasedChannel,
    GuildMember,
    GuildTextBasedChannel,
    Message,
    MessageReaction,
    PartialMessage,
    PartialUser,
    ReadonlyCollection,
    Snowflake,
    User,
    VoiceState
} from "discord.js";

export type PaxmodModerateTextSuccessResponse = {
    status: "success";
    id: string;
    service: string;
    request: {
        original_message: string;
        processed_message: string;
        timestamp: string;
    };
    result: "flagged" | "not_flagged";
    reason?: string;
    content_moderation?: {
        flagged: boolean;
        categories: Record<
            string,
            {
                flagged: boolean;
                score: number;
                threshold: number;
            }
        >;
    };
};

export type LogEventArgs = {
    [LogEventType.MessageDelete]: [
        message: Message<true>,
        moderator?: User | PartialUser
    ];
    [LogEventType.MessageUpdate]: [
        oldMessage: Message<true>,
        newMessage: Message<true>
    ];
    [LogEventType.MessageDeleteBulk]: [payload: LogMessageBulkDeletePayload];
    [LogEventType.MessageReactionClear]: [
        payload: LogMessageReactionClearPayload
    ];
    [LogEventType.SystemAutoModRuleModeration]: [
        type: "profile" | "message",
        messageOrMember: Message | GuildMember,
        rule: RuleDefinition,
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
    [LogEventType.MemberTimeoutAdd]: [payload: LogMemberTimeoutAddPayload];
    [LogEventType.MemberTimeoutRemove]: [
        payload: LogMemberTimeoutRemovePayload
    ];
    [LogEventType.MemberWarningAdd]: [payload: LogMemberWarningAddPayload];
    [LogEventType.MemberModeratorMessageAdd]: [
        payload: LogMemberModMessageAddPayload
    ];
    [LogEventType.UserNoteAdd]: [payload: LogUserNoteAddPayload];
    [LogEventType.MemberRoleModification]: [
        payload: LogMemberRoleModificationPayload
    ];
    [LogEventType.SystemUserMessageSave]: [message: Message, moderator: User];
    [LogEventType.RaidAlert]: [payload: LogRaidAlertPayload];
    [LogEventType.MemberNicknameModification]: [
        payload: LogMemberNicknameModificationPayload
    ];
    [LogEventType.GuildVerificationAttempt]: [
        payload: LogGuildVerificationAttemptPayload
    ];
    [LogEventType.GuildVerificationSuccess]: [
        payload: LogGuildVerificationSuccessPayload
    ];
    [LogEventType.GuildVerificationNotEnoughInfo]: [
        payload: LogGuildVerificationNotEnoughInfoPayload
    ];
    [LogEventType.GuildVerificationNotEnoughInfo]: [
        payload: LogGuildVerificationNotEnoughInfoPayload
    ];
    [LogEventType.NewMemberMessageInspection]: [
        payload: LogNewMemberMessageInspectionPayload
    ];
    [LogEventType.MemberVoiceChannelJoin]: [
        member: GuildMember,
        channel: GuildBasedChannel,
        state: VoiceState
    ];
    [LogEventType.MemberVoiceChannelLeave]: [
        member: GuildMember,
        channel: GuildBasedChannel,
        state: VoiceState
    ];
};

export type LogNewMemberMessageInspectionPayload = {
    member: GuildMember;
    data: PaxmodModerateTextSuccessResponse;
    message: Message<boolean>;
    mentions: Snowflake[];
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
    moderator?: User | PartialUser;
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
    moderator: User | PartialUser;
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

export type LogMemberTimeoutRemovePayload = LogModerationActionCommonPayload & {
    member: GuildMember;
    infractionId?: number;
};

export type LogMemberTimeoutAddPayload = LogMemberTimeoutRemovePayload & {
    duration: Duration;
};

export type LogMessageBulkDeletePayload = Omit<
    LogModerationActionCommonPayload,
    "moderator" | "guild"
> & {
    messages: ReadonlyCollection<
        string,
        Message<boolean> | PartialMessage | undefined
    >;
    channel: GuildTextBasedChannel;
    moderator?: User | PartialUser;
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

export type LogMemberWarningAddPayload = Omit<
    LogModerationActionCommonPayload,
    "guild"
> & {
    member: GuildMember;
    infractionId: number;
};

export type LogMemberModMessageAddPayload = LogMemberWarningAddPayload;
export type LogUserNoteAddPayload = LogModerationActionCommonPayload & {
    user: User;
    infractionId: number;
};

export type LogMemberKickPayload = Omit<
    LogModerationActionCommonPayload,
    "moderator" | "guild"
> & {
    moderator?: User;
    member: GuildMember;
    infractionId?: number;
};

export type LogMemberBanAddPayload = Omit<
    LogModerationActionCommonPayload,
    "moderator"
> & {
    moderator?: User;
    user: User;
    infractionId?: number;
    duration?: Duration;
    deletionTimeframe?: Duration;
};

export type LogMemberBanRemovePayload = Omit<
    LogModerationActionCommonPayload,
    "moderator"
> & {
    moderator?: User;
    user: User;
    infractionId?: number;
};

export * from "@schemas/defs/LoggingSchema";
