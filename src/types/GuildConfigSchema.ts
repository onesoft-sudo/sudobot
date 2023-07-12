import { z } from "zod";
import { isSnowflake } from "../utils/utils";

const zSnowflake = z.custom<string>((data) => {
    return typeof data === "string" && isSnowflake(data);
});

export const GuildConfigSchema = z.object({
    prefix: z.string(),
    mod_role: z.string().optional(),
    admin_role: z.string().optional(),
    infractions: z
        .object({
            send_ids_to_user: z.boolean().default(true),
        })
        .optional(),
    muting: z
        .object({
            role: zSnowflake.optional(),
        })
        .optional(),
    logging: z
        .object({
            enabled: z.boolean().default(false),
            primary_channel: zSnowflake.optional(),
        })
        .optional(),
    message_filter: z
        .object({
            enabled: z.boolean().default(false),
            send_logs: z
                .boolean()
                .or(
                    z.object({
                        blocked_words: z.boolean().default(false),
                        blocked_tokens: z.boolean().default(false),
                    })
                )
                .default(false),
            delete_message: z
                .boolean()
                .or(
                    z.object({
                        blocked_words: z.boolean().default(false),
                        blocked_tokens: z.boolean().default(false),
                    })
                )
                .default(false),
            data: z
                .object({
                    blocked_words: z.array(z.string()).optional().default([]),
                    blocked_tokens: z.array(z.string()).optional().default([]),
                })
                .optional(),
        })
        .optional(),
});

export type GuildConfig = z.infer<typeof GuildConfigSchema>;
