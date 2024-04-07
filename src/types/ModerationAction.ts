import { z } from "zod";
import { zSnowflake } from "./SnowflakeSchema";

const CommonOptions = {
    reason: z.string().optional(),
    notify: z.boolean().optional()
};

export const ModerationAction = z.union([
    z.object({
        ...CommonOptions,
        type: z.literal("ban"),
        delete_timeframe: z
            .number()
            .int()
            .min(0)
            .max(7 * 24 * 60 * 60 * 1000)
            .optional(), // 7 days,
        duration: z.number().int().min(0)
    }),
    z.object({
        ...CommonOptions,
        type: z.literal("kick")
    }),
    z.object({
        ...CommonOptions,
        type: z.literal("mute"),
        duration: z.number().int().min(0).optional()
    }),
    z.object({
        ...CommonOptions,
        type: z.literal("role"),
        mode: z.enum(["give", "take"]),
        roles: z.array(zSnowflake),
        duration: z.number().int().min(0).optional()
    }),
    z.object({
        type: z.literal("none")
    }),
    z.object({
        ...CommonOptions,
        type: z.literal("warn")
    }),
    z.object({
        notify: z.literal(true).default(true),
        type: z.literal("verbal_warn"),
        reason: z.string().optional()
    }),
    z.object({
        ...CommonOptions,
        type: z.literal("clear"),
        count: z.number().int().min(1).default(20)
    })
]);

export type ModerationAction = z.infer<typeof ModerationAction>;
