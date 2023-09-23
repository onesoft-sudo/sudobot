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

export const MemberStatusUpdateTrigger = z.object({
    ...Common,
    type: z.literal("member_status_update"),
    must_contain: z.array(z.string()).default([]),
    must_not_contain: z.array(z.string()).default([]),
    action: z.enum(["assign_role", "take_away_role"]),
    roles: z.array(zSnowflake).default([])
});

export const TriggerSchema = z.union([StickyMessageTrigger, MemberStatusUpdateTrigger]);
export type TriggerType = z.infer<typeof TriggerSchema>;
