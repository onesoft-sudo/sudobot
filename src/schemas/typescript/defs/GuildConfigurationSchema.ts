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

import z from "zod";
import { LoggingSchema } from "./LoggingSchema";
import { SnowflakeSchema } from "./SnowflakeSchema";
import { RuleSchema } from "./RuleSchema";

export const GuildConfigurationSchema = z.object({
    commands: z
        .object({
            prefix: z
                .string()
                .min(1)
                .regex(/^[^\s]+$/)
                .prefault("-")
        })
        .optional(),
    permissions: z
        .object({
            mode: z
                .enum(["discord", "leveled", "layered", "selinux"])
                .prefault("discord")
        })
        .optional(),
    logging: LoggingSchema.optional(),
    infractions: z
        .object({
            send_ids_to_user: z.boolean().default(false),
            dm_fallback: z
                .enum(["none", "create_channel", "create_thread"])
                .default("none"),
            dm_fallback_parent_channel: SnowflakeSchema.optional(),
            dm_fallback_channel_expires_in: z
                .number()
                .int()
                .optional()
                .default(604800000), // 1 week
            reason_templates: z
                .record(
                    z.string().regex(/^[A-Za-z0-9_-]+$/i),
                    z
                        .string()
                        .min(
                            1,
                            "Reason template must be at least 1 character long"
                        )
                )
                .describe(
                    "A record of reason templates. The key is the name of the template, and the value is the template itself."
                )
                .default({}),
            reason_template_placeholder_wrapper: z
                .string()
                .default("{{%name%}}"),
            points: z
                .object({
                    warning: z.number().int().default(1),
                    mute: z.number().int().default(3),
                    timeout: z.number().int().default(3),
                    kick: z.number().int().default(5),
                    ban: z.number().int().default(10),
                    tempban: z.number().int().default(8),
                    softban: z.number().int().default(7),
                    unban: z.number().int().default(0),
                    note: z.number().int().default(0),
                    clear: z.number().int().default(0),
                    role: z.number().int().default(0),
                    moderator_message: z.number().int().default(2),
                    massban: z.number().int().default(10),
                    masskick: z.number().int().default(5),
                    reaction_clear: z.number().int().default(0)
                })
                .prefault({})
        })
        .prefault({}),
    muting: z
        .object({
            role: SnowflakeSchema.optional()
        })
        .optional(),
    rule_moderation: z.object({
        enabled: z.boolean().prefault(false),
        message_rules: z.array(RuleSchema).prefault([]),
        profile_rules: z.array(RuleSchema).prefault([]),
    }).optional()
});

export type GuildConfigurationType = z.infer<typeof GuildConfigurationSchema>;

export const GuildConfigurationDefaultValue = GuildConfigurationSchema.parse(
    {}
);
