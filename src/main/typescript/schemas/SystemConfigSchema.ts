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

import type { ActivityType } from "discord.js";
import { z } from "zod";

type ApplicationActivityType = keyof typeof ActivityType;

export const SystemConfigSchema = z.object({
    $schema: z.string().optional(),
    sync_emojis: z.boolean().default(true),
    emoji_resolve_strategy: z.enum(["both", "home_guild", "application"]).default("both"),
    system_admins: z.array(z.string()).default([]),
    snippets: z
        .object({
            save_attachments: z.boolean().default(false).optional()
        })
        .optional(),
    restart_exit_code: z.number().int().default(1),
    trust_proxies: z.number().int().optional(),
    presence: z
        .object({
            name: z.string().optional(),
            status: z.enum(["online", "idle", "dnd", "invisible"]).optional(),
            url: z.string().optional(),
            type: z.enum([
                "Competing",
                "Listening",
                "Playing",
                "Streaming",
                "Watching",
                "Custom"
            ] satisfies [ApplicationActivityType, ...ApplicationActivityType[]])
        })
        .optional(),
    commands: z
        .object({
            mention_prefix: z.boolean().default(true),
            groups: z.record(z.string(), z.array(z.string())).default({}),
            register_application_commands_on_boot: z
                .enum(["always_global", "guild", "none", "auto_global"])
                .default("auto_global"),
            global_disabled: z.array(z.string()).default([]),
            system_banned_users: z.array(z.string()).default([])
        })
        .default({}),
    enable_file_filter: z.boolean().default(false),
    command_permission_mode: z.enum(["ignore", "overwrite", "check"]).default("overwrite"),
    api: z
        .object({
            enabled: z.boolean().default(true),
            server_status: z
                .enum([
                    "operational",
                    "degraded",
                    "partial_outage",
                    "major_outage",
                    "maintenance",
                    "error"
                ])
                .default("operational"),
            server_status_description: z.string().optional(),
            server_status_started_at: z.string().pipe(z.coerce.date()).or(z.date()).optional()
        })
        .default({}),
    extensions: z
        .object({
            default_mode: z.enum(["enable_all", "disable_all"]).default("enable_all")
        })
        .default({}),
    log_server: z
        .object({
            enabled: z.boolean().default(false),
            auto_start: z.boolean().default(false)
        })
        .optional(),
    logging: z
        .object({
            enabled: z.boolean().default(false),
            webhook_url: z.string().url()
        })
        .optional(),
    statistics: z
        .object({
            enabled: z.boolean().default(false),
            sync_delay: z.number().int().default(60_000)
        })
        .optional()
});

export type SystemConfig = z.infer<typeof SystemConfigSchema>;
export type APIStatus = SystemConfig["api"]["server_status"];
