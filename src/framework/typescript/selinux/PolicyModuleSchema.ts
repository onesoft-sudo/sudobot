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

import { SnowflakeSchema } from "@schemas/SnowflakeSchema";
import { z } from "zod";

export const PolicyModuleTypeLabelCommonPatternSchema = z.object({
    pattern: z.tuple([z.string(), z.string()]),
    entity_type: z.enum(["member", "role", "channel"]),
    entity_attr: z.enum(["name", "username", "nickname", "id", "topic", "parent_id"]),
    context: z.int()
});

export const PolicyModuleTypeLabelMemberPatternSchema = z.object({
    context: z.int(),
    requiredRoles: z.array(SnowflakeSchema),
    excludedRoles: z.array(SnowflakeSchema)
});

export const PolicyModuleSchema = z.object({
    policy_module: z.object({
        name: z.string().prefault(() => `${Date.now}${Math.random() * 10000}`),
        version: z.int().min(0).max(1000),
        author: z.string().optional()
    }),
    map_types: z.array(z.string()),
    type_labeling: z
        .object({
            commonPatterns: z.array(PolicyModuleTypeLabelCommonPatternSchema),
            memberPatterns: z.array(PolicyModuleTypeLabelMemberPatternSchema)
        })
        .optional(),
    allow_types: z.array(z.union([z.string(), z.bigint()])),
    deny_types: z.array(z.union([z.string(), z.bigint()])),
    allow_types_on_targets: z.record(z.int(), z.record(z.int(), z.union([z.string(), z.bigint()]))),
    deny_types_on_targets: z.record(z.int(), z.record(z.int(), z.union([z.string(), z.bigint()])))
});

export type PolicyModuleType = z.infer<typeof PolicyModuleSchema>;
