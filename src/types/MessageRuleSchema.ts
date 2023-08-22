import { z } from "zod";
import { zSnowflake } from "./GuildConfigSchema";

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

export const BlockedDomainRule = z
    .object({
        type: z.literal("blocked_domain"),
        scan_links_only: z.boolean().default(false)
    })
    .extend(Common)
    .extend(hasStringArrayData);

export const BlockedMimeTypeRule = z
    .object({
        type: z.literal("blocked_mime_type")
    })
    .extend(Common)
    .extend(hasStringArrayData);

export const BlockedFileExtensionRule = z
    .object({
        type: z.literal("blocked_file_extension")
    })
    .extend(Common)
    .extend(hasStringArrayData);

export const AntiInviteRule = z
    .object({
        type: z.literal("anti_invite"),
        allowed_invite_codes: z.array(z.string()).default([]),
        allow_internal_invites: z.boolean().default(true)
    })
    .extend(Common);

export const RegexFilterRule = z
    .object({
        type: z.literal("regex_filter"),
        patterns: z.array(z.string().or(z.tuple([z.string(), z.string()]))).default([])
    })
    .extend(Common);

export const BlockRepeatedTextRule = z
    .object({
        type: z.literal("block_repeated_text"),
        max_repeated_chars: z.number().int().default(20),
        max_repeated_words: z.number().int().default(15)
    })
    .extend(Common);

export const MessageRuleSchema = z.union([
    BlockedDomainRule,
    BlockedMimeTypeRule,
    BlockedFileExtensionRule,
    AntiInviteRule,
    RegexFilterRule,
    BlockRepeatedTextRule
]);

export type MessageRuleType = z.infer<typeof MessageRuleSchema>;
