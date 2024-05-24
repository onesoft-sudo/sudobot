import { zSnowflake } from "@main/schemas/SnowflakeSchema";
import { z } from "zod";

const SurveyQuestion = z.object({
    type: z.enum(["paragraph", "short"]),
    question: z.string(),
    required: z.boolean().default(true),
    maxLength: z.number().int().optional(),
    minLength: z.number().int().optional(),
    placeholder: z.string().optional(),
    default_value: z.string().optional()
});

export const SurveySystemConfigSchema = z.object({
    enabled: z.boolean().default(false),
    default_log_channel: zSnowflake.optional(),
    surveys: z
        .record(
            z.string().regex(/^[a-z0-9_-]+$/i),
            z.object({
                name: z.string(),
                questions: z.array(SurveyQuestion).nonempty(),
                required_channels: z.array(zSnowflake).default([]),
                required_roles: z.array(zSnowflake).default([]),
                required_permissions: z.array(z.string()).default([]),
                required_users: z.array(zSnowflake).default([]),
                description: z.string().optional(),
                end_message: z.string().optional(),
                log_channel: zSnowflake.optional()
            })
        )
        .describe(
            `
    A record of surveys. The key is the interaction custom ID of the survey, and the value is the survey itself.
    `
        )
        .default({})
});
