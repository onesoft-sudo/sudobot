import type Duration from "@framework/datetime/Duration";
import type { PaxmodModerateTextSuccessResponse } from "@main/automod/NewMemberMessageInspectionService";
import type { RuleExecResult } from "@main/contracts/ModerationRuleHandlerContract";
import type { LogEventType } from "@schemas/LoggingSchema";
import type { MessageRuleType } from "@schemas/MessageRuleSchema";
import type { ModerationActionType } from "@schemas/ModerationActionSchema";
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

export type LogEventArgs = {
    [LogEventType.MessageDelete]: [message: Message<true>, moderator?: User | PartialUser];
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
    [LogEventType.MemberTimeoutAdd]: [payload: LogMemberTimeoutAddPayload];
    [LogEventType.MemberTimeoutRemove]: [payload: LogMemberTimeoutRemovePayload];
    [LogEventType.MemberWarningAdd]: [payload: LogMemberWarningAddPayload];
    [LogEventType.MemberModeratorMessageAdd]: [payload: LogMemberModMessageAddPayload];
    [LogEventType.UserNoteAdd]: [payload: LogUserNoteAddPayload];
    [LogEventType.MemberRoleModification]: [payload: LogMemberRoleModificationPayload];
    [LogEventType.SystemUserMessageSave]: [message: Message, moderator: User];
    [LogEventType.RaidAlert]: [payload: LogRaidAlertPayload];
    [LogEventType.MemberNicknameModification]: [payload: LogMemberNicknameModificationPayload];
    [LogEventType.GuildVerificationAttempt]: [payload: LogGuildVerificationAttemptPayload];
    [LogEventType.GuildVerificationSuccess]: [payload: LogGuildVerificationSuccessPayload];
    [LogEventType.GuildVerificationNotEnoughInfo]: [payload: LogGuildVerificationNotEnoughInfoPayload];
    [LogEventType.GuildVerificationNotEnoughInfo]: [payload: LogGuildVerificationNotEnoughInfoPayload];
    [LogEventType.NewMemberMessageInspection]: [payload: LogNewMemberMessageInspectionPayload];
    [LogEventType.MemberVoiceChannelJoin]: [member: GuildMember, channel: GuildBasedChannel, state: VoiceState];
    [LogEventType.MemberVoiceChannelLeave]: [member: GuildMember, channel: GuildBasedChannel, state: VoiceState];
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

export type LogMemberMassUnbanPayload = Omit<LogMemberMassBanPayload, "duration" | "deletionTimeframe">;

export type LogMemberMassKickPayload = Omit<LogMemberMassBanPayload, "duration" | "deletionTimeframe" | "users"> & {
    members: Array<Snowflake | GuildMember>;
};

export type LogMemberRoleModificationPayload = Omit<LogModerationActionCommonPayload, "moderator"> & {
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

export type LogMessageBulkDeletePayload = Omit<LogModerationActionCommonPayload, "moderator" | "guild"> & {
    messages: ReadonlyCollection<string, Message<boolean> | PartialMessage | undefined>;
    channel: GuildTextBasedChannel;
    moderator?: User | PartialUser;
    infractionId?: number;
    user?: User;
};

export type LogMessageReactionClearPayload = Omit<LogModerationActionCommonPayload, "moderator" | "guild"> & {
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

export * from "@schemas/index";
