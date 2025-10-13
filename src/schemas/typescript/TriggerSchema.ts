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
