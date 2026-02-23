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
import z from "zod";

export const SystemConfigurationSchema = z.object({
    system_admins: z.array(SnowflakeSchema).prefault([]),
    emoji_resolve_strategy: z.enum(["application", "home_guild", "both"]).prefault("both"),
    restart_exit_code: z.int().min(0).max(255).prefault(0),
    presence: z.object({
        type: z.enum(["Playing", "Streaming", "Listening", "Watching", "Competing", "Custom"]).prefault("Watching"),
        name: z.string(),
        url: z.url().optional(),
        status: z.enum(["online", "idle", "dnd", "invisible"]).prefault("dnd")
    })
});

export type SystemConfigurationType = z.infer<typeof SystemConfigurationSchema>;

export const SystemConfigurationDefaultValue = SystemConfigurationSchema.parse({});
