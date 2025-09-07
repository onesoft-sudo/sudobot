import z from "zod";
import { zSnowflake } from "@sudobot/schemas/SnowflakeSchema";

export const CountingConfigSchema = z.object({
    enabled: z.boolean().optional(),
    hardcore: z.boolean().optional().default(false),
    channel: zSnowflake
});

export type CountingConfig = z.infer<typeof CountingConfigSchema>;
