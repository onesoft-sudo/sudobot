/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025 OSN Developers.
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

import { ModerationActionSchema } from "@main/schemas/ModerationActionSchema";
import { z } from "zod";

export const AIAutoModSchema = z.object({
    enabled: z.boolean().optional().default(false),
    max_total_score: z.number().int().default(10),
    max_single_score: z.number().int().default(7),
    max_individual_scores: z
        .object({
            toxicity: z.number().int().default(7),
            threat: z.number().int().default(7),
            severe_toxicity: z.number().int().default(7),
            identity_attack: z.number().int().default(7),
            insult: z.number().int().default(7),
            profanity: z.number().int().default(7),
            sexually_explicit: z.number().int().default(7),
            flirtation: z.number().int().default(7),
            spam: z.number().int().default(7),
            obscene: z.number().int().default(7),
            incoherent: z.number().int().default(7),
            unsubstantial: z.number().int().default(7)
        })
        .optional(),
    exception_regex_patterns: z
        .array(z.string().or(z.tuple([z.string(), z.string()])))
        .default([]),
    evaluate_after_attempts: z.number().int().default(-1),
    evaluation_cache_expires_in: z.number().int().default(3_000),
    actions: z.array(ModerationActionSchema).default([]),
    automatic_actions: z
        .object({
            enabled: z.boolean().default(false),
            stops: z
                .record(
                    z
                        .string()
                        .regex(/[0-9.]+/)
                        .or(z.literal("*")),
                    z.array(ModerationActionSchema)
                )
                .prefault({
                    12: [
                        {
                            type: "mute",
                            duration: 1000 * 60 * 60 * 2, // 2 hours
                            reason: "The system has detected that your messages might violate the rules."
                        },
                        {
                            type: "clear"
                        }
                    ]
                })
        })
        .optional()
});
