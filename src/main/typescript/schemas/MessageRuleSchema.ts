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

import { z } from "zod";
import { ModerationActionSchema } from "./ModerationActionSchema";
import { zSnowflake } from "./SnowflakeSchema";

const hasStringArrayData = {
    data: z.array(z.string()).default([])
};

const MessageRuleConditionSchema = z.object({
    roles: z.array(zSnowflake).optional(),
    users: z.array(zSnowflake).optional(),
    channels: z.array(zSnowflake).optional()
});

const Common = {
    name: z.string().nullable().default(null),
    actions: z.array(ModerationActionSchema).default([]),
    mode: z.enum(["normal", "invert"]).default("normal"),
    enabled: z.boolean().default(true),
    bail: z.boolean().default(true),
    for: MessageRuleConditionSchema.optional(),
    exceptions: MessageRuleConditionSchema.optional(),
    is_bypasser: z.boolean().default(false),
    bypasses: z.array(z.string()).nullable().default(null)
};

export const DomainFilterRule = z
    .object({
        ...Common,
        type: z.literal("domain_filter"),
        domains: z.array(z.string()).default([]),
        scan_links_only: z.boolean().default(false)
    })
    .describe("[DEPRECATED] Use RegexFilterRule instead.");

export const MimeTypeFilterRule = z.object({
    ...Common,
    ...hasStringArrayData,
    type: z.literal("mime_type_filter")
});

export const FileExtensionFilterRule = z.object({
    ...Common,
    ...hasStringArrayData,
    type: z.literal("file_extension_filter")
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
    patterns: z
        .array(
            z
                .string()
                .or(
                    z.tuple([
                        z.string().describe("The pattern"),
                        z.string().describe("The flags for this regex pattern")
                    ])
                )
        )
        .default([])
});

export const RepeatedTextFilterRule = z.object({
    ...Common,
    type: z.literal("repeated_text_filter"),
    max_repeated_chars: z.number().int().default(20),
    max_repeated_words: z.number().int().default(15)
});

export const MassMentionFilterRule = z.object({
    ...Common,
    type: z.literal("mass_mention_filter"),
    max_mentions: z.number().int().default(15),
    max_user_mentions: z.number().int().default(-1),
    max_role_mentions: z.number().int().default(-1)
});

export const ImageFilterRule = z.object({
    ...Common,
    type: z.literal("image_filter"),
    tokens: z.array(z.string()).default([]),
    words: z.array(z.string()).default([]),
    inherit_from_word_filter: z.boolean().default(false),
    scan_embeds: z.boolean().default(false)
});

export const EmbedFilterRule = z.object({
    ...Common,
    type: z.literal("embed_filter"),
    tokens: z.array(z.string()).default([]),
    words: z.array(z.string()).default([]),
    inherit_from_word_filter: z.boolean().default(false)
});

export const URLCrawlRule = z
    .object({
        ...Common,
        type: z.literal("EXPERIMENTAL_url_crawl"),
        excluded_domains_regex: z.array(z.string()).default([]),
        excluded_links: z.array(z.string().url()).default([]),
        excluded_link_regex: z.array(z.string()).default([]),
        tokens: z.array(z.string()).default([]),
        words: z.array(z.string()).default([])
    })
    .describe("Experimental. Use at your own risk.");

export const NSFWFilter = z
    .object({
        ...Common,
        type: z.literal("EXPERIMENTAL_nsfw_filter"),
        score_thresholds: z
            .object({
                hentai: z.number().min(0).max(1).default(0.35),
                porn: z.number().min(0).max(1).default(0.35),
                sexy: z.number().min(0).max(1).default(0.8)
            })
            .default({})
    })
    .describe("Experimental. Use at your own risk.");

export const WordFilter = z.object({
    ...Common,
    type: z.literal("word_filter"),
    tokens: z.array(z.string()).default([]),
    words: z.array(z.string()).default([]),
    normalize: z.boolean().default(true)
});

export const FileFilter = z.object({
    ...Common,
    type: z.literal("file_filter"),
    hashes: z.record(z.string(), z.string().nullable()).default({}),
    check_mime_types: z.boolean().default(false)
});

export const AIScanFilter = z.object({
    ...Common,
    type: z.literal("ai_scan"),
    toxicity_threshold: z.number().min(0).max(1).default(0.5),
    identity_attack_threshold: z.number().min(0).max(1).default(0.5),
    insult_threshold: z.number().min(0).max(1).default(0.5),
    profanity_threshold: z.number().min(0).max(1).default(0.5),
    sexual_explicit_threshold: z.number().min(0).max(1).default(0.5),
    threat_threshold: z.number().min(0).max(1).default(0.5),
    severe_toxicity_threshold: z.number().min(0).max(1).default(0.5),
    flirtation_threshold: z.number().min(0).max(1).default(0.5)
});

export const ProfileFilter = z.object({
    ...Common,
    type: z.literal("profile_filter"),
    tokens: z.array(z.string()).default([]),
    words: z.array(z.string()).default([]),
    regex_patterns: z.array(z.string()).default([]),
    normalize: z.boolean().default(true)
});

export const MessageRuleSchema = z.union([
    DomainFilterRule,
    MimeTypeFilterRule,
    FileExtensionFilterRule,
    AntiInviteRule,
    RegexFilterRule,
    RepeatedTextFilterRule,
    MassMentionFilterRule,
    ImageFilterRule,
    EmbedFilterRule,
    URLCrawlRule,
    NSFWFilter,
    WordFilter,
    ProfileFilter,
    FileFilter,
    AIScanFilter
]);

export type MessageRuleType = z.infer<typeof MessageRuleSchema>;
