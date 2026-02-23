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

import type { Snowflake } from "discord.js";
import { PolicyModuleTypeLabelCommonPatternSchema, PolicyModuleTypeLabelMemberPatternSchema } from "./PolicyModuleSchema";
import { z } from 'zod';

export const AVCSchema = z.object({
    details: z.object({
        version: z.int().min(0),
    }),
    typeLabelPatterns: z.object({
        members: z.array(PolicyModuleTypeLabelCommonPatternSchema),
        roles: z.array(PolicyModuleTypeLabelCommonPatternSchema),
        channels: z.array(PolicyModuleTypeLabelCommonPatternSchema),
        memberPatterns: z.array(PolicyModuleTypeLabelMemberPatternSchema),
    }),
    mapTypes: z.any(),
    allowTypes: z.any(),
    denyTypes: z.any(),
    allowTypesOnTargets: z.any(),
    denyTypesOnTargets: z.any(),
    mapTypeIds: z.any(),
    entityContexts: z.any(),
    nextTypeId: z.int()
});

export const CacheSchema = z.object({
    avc: AVCSchema,
    modules: z.any()
});

export type AVCType = Pick<z.infer<typeof AVCSchema>, "details" | "nextTypeId" | "typeLabelPatterns"> & {
    mapTypes: Map<number, string>;
    mapTypeIds: Map<string, number>;
    allowTypes: Map<number, bigint>;
    denyTypes: Map<number, bigint>;
    allowTypesOnTargets: Map<bigint, bigint>;
    denyTypesOnTargets: Map<bigint, bigint>;
    entityContexts: Map<Snowflake, number>;
};
