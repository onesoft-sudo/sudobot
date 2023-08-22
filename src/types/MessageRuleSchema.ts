import { z } from "zod";

export const MessageRuleAction = z.enum(["delete", "verbal_warn", "warn", "mute", "clear"]);

const hasStringArrayData = {
    data: z.array(z.string()).default([])
};

const Common = {
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

export const MessageRuleSchema = z.union([BlockedDomainRule, BlockedMimeTypeRule, BlockedFileExtensionRule]);
export type MessageRuleType = z.infer<typeof MessageRuleSchema>;
