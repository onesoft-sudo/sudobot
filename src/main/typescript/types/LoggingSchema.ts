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
    [LogEventType.MessageDeleteBulk]: [
        messages: Collection<string, Message<boolean> | PartialMessage>,
        channel: GuildTextBasedChannel,
        moderator?: User
    ];
    [LogEventType.SystemAutoModRuleModeration]: [
        message: Message,
        rule: MessageRuleType,
        result: RuleExecResult
    ];
    [LogEventType.MemberBanAdd]: [payload: LogMemberBanAddPayload];
    [LogEventType.MemberBanRemove]: [payload: LogMemberBanRemovePayload];
    [LogEventType.GuildMemberAdd]: [member: GuildMember];
    [LogEventType.GuildMemberRemove]: [member: GuildMember];
};

type LogModerationActionCommonPayload = {
    guild: Guild;
    moderator: User;
    reason?: string;
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
