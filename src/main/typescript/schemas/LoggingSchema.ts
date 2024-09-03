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
    RaidAlert = "raid_alert"
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
