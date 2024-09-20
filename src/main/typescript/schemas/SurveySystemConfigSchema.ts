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
