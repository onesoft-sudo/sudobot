import type Duration from "@framework/datetime/Duration";
import type { RuleExecResult } from "@main/contracts/ModerationRuleHandlerContract";
import type { MessageRuleType } from "@main/types/MessageRuleSchema";
import { zSnowflake } from "@main/types/SnowflakeSchema";
import type {
    Collection,
    Guild,
    GuildMember,
    GuildTextBasedChannel,
    Message,
    PartialMessage,
    Snowflake,
    User
} from "discord.js";
import { z } from "zod";

export enum LogEventType {
    MessageDelete = "message_delete",
    MessageUpdate = "message_update",
    MessageDeleteBulk = "message_delete_bulk",
    MemberBanAdd = "member_ban_add",
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
    SystemAutoModRuleModeration = "system_automod_rule_moderation"
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
        message: Message,
        rule: MessageRuleType,
        result: RuleExecResult
    ];
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
};

type LogModerationActionCommonPayload = {
    guild: Guild;
    moderator: User;
    reason?: string;
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
    messages: Collection<string, Message<boolean> | PartialMessage | undefined>;
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
    overrides: z.array(LogConfigOverride).default([])
});
