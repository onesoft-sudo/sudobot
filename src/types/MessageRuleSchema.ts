import { z } from "zod";
import { zSnowflake } from "./SnowflakeSchema";

export const MessageRuleAction = z.enum(["delete", "verbal_warn", "warn", "mute", "clear"]);

const hasStringArrayData = {
    data: z.array(z.string()).default([])
};

const Common = {
    disabled_channels: z.array(zSnowflake).default([]),
    immune_roles: z.array(zSnowflake).default([]),
    immune_users: z.array(zSnowflake).default([]),
    actions: z.array(MessageRuleAction).default([]),
    verbal_warning_reason: z.string().optional(),
    warning_reason: z.string().optional(),
    mute_reason: z.string().optional(),
    common_reason: z.string().optional(),
    mute_duration: z.number().int().default(-1)
};

export const BlockedDomainRule = z.object({
    ...Common,
    ...hasStringArrayData,
    type: z.literal("blocked_domain"),
    scan_links_only: z.boolean().default(false)
});

export const BlockedMimeTypeRule = z.object({
    ...Common,
    ...hasStringArrayData,
    type: z.literal("blocked_mime_type")
});

export const BlockedFileExtensionRule = z.object({
    ...Common,
    ...hasStringArrayData,
    type: z.literal("blocked_file_extension")
});

export const AntiInviteRule = z.object({
    ...Common,
    type: z.literal("anti_invite"),
    allowed_invite_codes: z.array(z.string()).default([]),
    allow_internal_invites: z.boolean().default(true)
});

export const RegexFilterRule = z.object({
    ...Common,
    type: z.literal("regex_filter"),
    patterns: z.array(z.string().or(z.tuple([z.string(), z.string()]))).default([])
});

export const BlockRepeatedTextRule = z.object({
    ...Common,
    type: z.literal("block_repeated_text"),
    max_repeated_chars: z.number().int().default(20),
    max_repeated_words: z.number().int().default(15)
});

export const BlockMassMentionRule = z.object({
    ...Common,
    type: z.literal("block_mass_mention"),
    max_mentions: z.number().int().default(15),
    max_user_mentions: z.number().int().default(-1),
    max_role_mentions: z.number().int().default(-1)
});

export const MessageRuleSchema = z.union([
    BlockedDomainRule,
    BlockedMimeTypeRule,
    BlockedFileExtensionRule,
    AntiInviteRule,
    RegexFilterRule,
    BlockRepeatedTextRule,
    BlockMassMentionRule
]);

export type MessageRuleType = z.infer<typeof MessageRuleSchema>;
