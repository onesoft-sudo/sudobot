/*
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

import { ActivityType } from "discord.js";
import { z } from "zod";
import { zSnowflake } from "./SnowflakeSchema";

type ApplicationActivityType = Exclude<keyof typeof ActivityType, "Custom">;

export const SystemConfigSchema = z.object({
    $schema: z.string().optional(),
    emojis: z.record(z.string()).optional().default({}),
    sync_emojis: z.boolean().default(false),
    system_admins: z.array(z.string()).default([]),
    snippets: z
        .object({
            save_attachments: z.boolean().default(false).optional()
        })
        .optional(),
    disabled_commands: z.array(z.string()).default([]),
    restart_exit_code: z.number().int().default(1),
    trust_proxies: z.number().int().optional(),
    presence: z
        .object({
            name: z.string().optional(),
            status: z.enum(["online", "idle", "dnd", "invisible"]).optional(),
            url: z.string().optional(),
            type: z.enum(
                Object.keys(ActivityType).filter(a => typeof a === "string" && a !== "Custom") as [
                    ApplicationActivityType,
                    ...ApplicationActivityType[]
                ]
            )
        })
        .optional(),
    commands: z
        .object({
            mention_prefix: z.boolean().default(true),
            groups: z.record(z.string(), z.array(z.string())).default({})
        })
        .default({}),
    enable_file_filter: z.boolean().default(false),
    default_permissions_mode: z.enum(["ignore", "overwrite", "check"]).default("check"),
    api: z
        .object({
            enabled: z.boolean().default(true),
            server_status: z
                .enum(["operational", "degraded", "partial_outage", "major_outage", "maintenence", "error"])
                .default("operational"),
            server_status_description: z.string().optional(),
            server_status_started_at: z.string().pipe(z.coerce.date()).or(z.date()).default(new Date())
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
            channels: z
                .object({
                    echo_send_logs: zSnowflake.optional()
                })
                .optional()
        })
        .optional(),
    sync_permission_managers_on_boot: z.boolean().default(false),
    debug_mode: z.boolean().default(false),
    statistics: z
        .object({
            enabled: z.boolean().default(false),
            sync_delay: z.number().int().default(60_000)
        })
        .optional()
});

export type SystemConfig = z.infer<typeof SystemConfigSchema>;
export type APIStatus = SystemConfig["api"]["server_status"];
