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

import { SnowflakeSchema } from "./SnowflakeSchema";
import { z } from 'zod';

export const EnvironmentVariableSchema = z.object({
    SUDOBOT_TOKEN: z.string(),
    SUDOBOT_HOME_GUILD_ID: SnowflakeSchema,
    SUDOBOT_SHARD_COUNT: z.string().regex(/^\d+$/).optional(),
    SUDOBOT_HIDE_MODIFICATIONS_URL_NOTICE: z.enum(["1", "0"]).prefault('0'),
    SUDOBOT_MODIFICATIONS_PUBLIC_URL: z.url().optional(),
    SUDOBOT_DATABASE_URL:z.string(),
});

export type EnvironmentVariableType = z.infer<typeof EnvironmentVariableSchema>;
