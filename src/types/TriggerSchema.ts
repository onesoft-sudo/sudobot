import { z } from "zod";
import { zSnowflake } from "./SnowflakeSchema";

const Common = {
    enabled_channels: z.array(zSnowflake).default([]).or(z.literal("all")),
    ignore_roles: z.array(zSnowflake).default([]),
    ignore_users: z.array(zSnowflake).default([])
};

export const StickyMessageTrigger = z.object({
    ...Common,
    type: z.literal("sticky_message"),
    message: z.string(),
    buttons: z
        .array(
            z.object({
                label: z.string(),
                url: z.string().url()
            })
        )
        .max(3)
        .default([])
});

export const TriggerSchema = StickyMessageTrigger;

export type TriggerType = z.infer<typeof TriggerSchema>;
