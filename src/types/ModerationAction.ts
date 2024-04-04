import { z } from "zod";
import { zSnowflake } from "./SnowflakeSchema";

export const ModerationAction = z.union([
    z.object({
        type: z.literal("ban"),
        reason: z.string().optional(),
        delete_timeframe: z.number().int().min(0).max(7 * 24 * 60 * 60 * 1000).optional(), // 7 days,
        duration: z.number().int().min(0)
    }),
    z.object({
        type: z.literal("kick"),
        reason: z.string().optional()
    }),
    z.object({
        type: z.literal("mute"),
        reason: z.string().optional(),
        duration: z.number().int().min(0).optional()
    }),
    z.object({
        type: z.literal("role"),
        mode: z.enum(["give", "take"]),
        roles: z.array(zSnowflake),
        reason: z.string().optional(),
        duration: z.number().int().min(0).optional()
    }),
    z.object({
        type: z.literal("none")
    }),
    z.object({
        type: z.literal("warn"),
        reason: z.string().optional()
    }),
    z.object({
        type: z.literal("verbal_warn"),
        reason: z.string().optional()
    }),
    z.object({
        type: z.literal("clear"),
        count: z.number().int().min(1).default(20),
        reason: z.string().optional()
    })
]);

export type ModerationAction = z.infer<typeof ModerationAction>;
