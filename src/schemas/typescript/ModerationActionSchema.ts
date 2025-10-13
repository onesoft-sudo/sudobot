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

const CommonOptions = {
    reason: z.string().optional(),
    notify: z.boolean().optional()
};

export const ModerationActionSchema = z.union([
    z.object({
        ...CommonOptions,
        type: z.literal("ban"),
        delete_timeframe: z
            .number()
            .int()
            .min(0)
            .max(7 * 24 * 60 * 60 * 1000)
            .optional(), // 7 days,
        duration: z.number().int().min(0).optional()
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
    }),
    z.object({
        type: z.literal("delete_message")
    })
]);

export const ModerationActionNameSchema = z.enum([
    "ban",
    "kick",
    "mute",
    "role",
    "none",
    "warn",
    "verbal_warn",
    "clear",
    "delete_message"
]);

export type ModerationActionType = z.infer<typeof ModerationActionSchema>;
