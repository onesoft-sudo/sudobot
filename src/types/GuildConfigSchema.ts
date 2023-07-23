/**
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
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
import { isSnowflake } from "../utils/utils";

const zSnowflake = z.custom<string>(data => {
    return typeof data === "string" && isSnowflake(data);
});

export const GuildConfigSchema = z.object({
    prefix: z.string().default("-"),
    permissions: z
        .object({
            mod_role: zSnowflake.optional(),
            admin_role: zSnowflake.optional()
        })
        .optional()
        .default({}),
    infractions: z
        .object({
            send_ids_to_user: z.boolean().default(true)
        })
        .optional(),
    muting: z
        .object({
            role: zSnowflake.optional()
        })
        .optional(),
    logging: z
        .object({
            enabled: z.boolean().default(false),
            primary_channel: zSnowflake.optional()
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
                        blocked_tokens: z.boolean().default(false)
                    })
                )
                .default(false),
            delete_message: z
                .boolean()
                .or(
                    z.object({
                        blocked_words: z.boolean().default(false),
                        blocked_tokens: z.boolean().default(false)
                    })
                )
                .default(false),
            data: z
                .object({
                    blocked_words: z.array(z.string()).optional().default([]),
                    blocked_tokens: z.array(z.string()).optional().default([])
                })
                .optional()
        })
        .optional(),
    antispam: z
        .object({
            enabled: z.boolean().optional().default(false),
            limit: z.number().int().default(-1).optional(),
            timeframe: z.number().int().default(-1).optional(),
            mute_duration: z.number().int().default(-1).optional(),
            action: z
                .union([
                    z.literal("verbal_warn"),
                    z.literal("warn"),
                    z.literal("warn"),
                    z.literal("mute"),
                    z.literal("mute_clear"),
                    z.literal("auto")
                ])
                .optional()
        })
        .optional()
});

export type GuildConfig = z.infer<typeof GuildConfigSchema>;
