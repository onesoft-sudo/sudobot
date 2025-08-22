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

import { AIAutoModSchema } from "@main/schemas/AIAutoModSchema";
import { LoggingSchema } from "@main/schemas/LoggingSchema";
import { SurveySystemConfigSchema } from "@main/schemas/SurveySystemConfigSchema";
import { TriggerSchema } from "@main/schemas/TriggerSchema";
import { z } from "zod";
import { MessageRuleSchema } from "./MessageRuleSchema";
import { ModerationActionSchema } from "./ModerationActionSchema";
import { zSnowflake } from "./SnowflakeSchema";

export const PermissionModeSchema = z.union([
    z.literal("discord"),
    z.literal("levels"),
    z.literal("layered")
]);

export type PermissionMode = z.infer<typeof PermissionModeSchema>;

/**
 * The configuration object schema. Times are in milliseconds.
 */
export const GuildConfigSchema = z.object({
    prefix: z.string().default("-"),
    debug_mode: z.boolean().default(false),
    commands: z
        .object({
            mention_prefix: z.boolean().default(true),
            moderation_command_behavior: z
                .enum(["delete", "default"])
                .default("default"),
            rerun_on_edit: z.boolean().default(false),
            channels: z
                .object({
                    list: z.array(zSnowflake).default([]),
                    mode: z.enum(["exclude", "include"]).default("exclude")
                })
                .prefault({}),
            disabled_commands: z.array(z.string()).default([]),
            respond_on_precondition_fail: z.boolean().default(true),
            ratelimiting: z
                .object({
                    enabled: z.boolean().default(true),
                    timeframe: z.number().int().default(7000),
                    max_attempts: z.number().int().default(5),
                    block_duration: z.number().int().default(1_000),
                    overrides: z
                        .record(
                            z.string(),
                            z.object({
                                enabled: z.boolean().default(true),
                                timeframe: z.number().int().default(7000),
                                max_attempts: z.number().int().default(5),
                                block_duration: z.number().int().default(1_000)
                            })
                        )
                        .prefault({})
                })
                .optional(),
            troll_command_immune_users: z.array(zSnowflake).default([])
        })
        .prefault({}),
    permissions: z
        .object({
            invincible: z
                .object({
                    roles: z.array(zSnowflake).default([]),
                    users: z.array(zSnowflake).default([])
                })
                .optional(),
            mode: PermissionModeSchema.default("discord").optional(),
            check_discord_permissions: z
                .enum([
                    "always",
                    "during_automod",
                    "during_manual_actions",
                    "never"
                ])
                .default("always"),
            command_permission_mode: z
                .enum(["ignore", "overwrite", "check"])
                .optional()
        })
        .optional()
        .prefault({}),
    echoing: z
        .object({
            allow_mentions: z.boolean().default(true)
        })
        .optional(),
    channel_archives: z
        .object({
            enabled: z.boolean().optional().default(false),
            archive_category: zSnowflake,
            ignored_channels: z.array(zSnowflake).default([])
        })
        .optional(),
    infractions: z
        .object({
            send_ids_to_user: z.boolean().default(false),
            dm_fallback: z
                .enum(["none", "create_channel", "create_thread"])
                .default("none"),
            dm_fallback_parent_channel: zSnowflake.optional(),
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
                    mod_message: z.number().int().default(2),
                    massban: z.number().int().default(10),
                    masskick: z.number().int().default(5),
                    reaction_clear: z.number().int().default(0)
                })
                .prefault({})
        })
        .prefault({}),
    antispam: z
        .object({
            enabled: z.boolean().optional().default(false),
            limit: z.number().int().min(1),
            timeframe: z.number().int().min(1),
            channels: z
                .object({
                    list: z.array(zSnowflake).default([]),
                    mode: z.enum(["exclude", "include"]).default("exclude")
                })
                .prefault({}),
            actions: z.array(ModerationActionSchema)
        })
        .optional(),
    ai_automod: AIAutoModSchema.optional(),
    extensions: z
        .object({
            enabled: z.boolean().optional(),
            installed_extensions: z.array(z.string()).default([]),
            disabled_extensions: z.array(z.string()).default([])
        })
        .optional(),
    muting: z
        .object({
            role: zSnowflake.optional()
        })
        .optional(),
    rule_moderation: z
        .object({
            enabled: z.boolean().default(false),
            rules: z.array(MessageRuleSchema).default([]),
            global_disabled_channels: z.array(zSnowflake).default([])
        })
        .optional(),
    logging: LoggingSchema.optional(),
    anti_member_join: z
        .object({
            enabled: z.boolean().optional().default(false),
            behavior: z.enum(["kick", "ban"]).default("kick"),
            custom_reason: z.string().optional(),
            ban_duration: z.number().int().optional(),
            ignore_bots: z.boolean().optional().default(false)
        })
        .optional(),
    reaction_roles: z
        .object({
            enabled: z.boolean().optional().default(false),
            ignore_bots: z.boolean().optional().default(true),
            ratelimiting: z
                .object({
                    enabled: z.boolean().optional().default(true),
                    timeframe: z.number().int().min(0).default(7000),
                    max_attempts: z.number().int().min(0).default(5),
                    block_duration: z.number().int().min(0).default(10_000)
                })
                .optional()
        })
        .optional(),
    survey_system: SurveySystemConfigSchema.optional(),
    raid_protection: z
        .object({
            enabled: z.boolean().optional().default(false),
            threshold: z.number().int().default(10),
            timeframe: z.number().int().default(60_000),
            action: z
                .enum(["auto", "lock", "antijoin", "lock_and_antijoin", "none"])
                .default("auto"),
            member_actions: z.array(ModerationActionSchema).default([]),
            send_log: z.boolean().optional().default(true),
            channels: z.array(zSnowflake).default([]),
            channel_mode: z.enum(["exclude", "include"]).default("exclude")
        })
        .optional(),
    member_verification: z
        .object({
            enabled: z.boolean().optional().default(false),
            vpn_proxy_check_enabled: z.boolean().optional().default(true),
            conditions: z.object({
                age_less_than: z.number().int().optional(),
                no_avatar: z.boolean().optional(),
                always: z.boolean().default(false)
            }),
            unverified_roles: z.array(zSnowflake).default([]),
            verified_roles: z.array(zSnowflake).default([]),
            expired_actions: z.array(ModerationActionSchema).default([]),
            verification_message: z.string().optional(),
            success_message: z.string().optional(),
            max_duration: z
                .number()
                .describe("Max verification duration (in seconds)")
                .int()
                .optional(),
            method: z
                .enum([
                    "channel_interaction",
                    "dm_interaction",
                    "channel_static_interaction"
                ])
                .default("dm_interaction"),
            channel: zSnowflake.optional(),
            message_id_internal: zSnowflake.optional(),
            alt_detection: z
                .object({
                    enabled: z.boolean().optional().default(false),
                    actions: z
                        .object({
                            moderationActions: z
                                .array(ModerationActionSchema)
                                .default([]),
                            failVerification: z
                                .boolean()
                                .optional()
                                .default(false)
                        })
                        .optional()
                })
                .optional()
        })
        .optional(),
    quick_mute: z
        .object({
            enabled: z.boolean().optional().default(false),
            mute_clear_emoji: z.string().optional(),
            mute_emoji: z.string().optional(),
            default_duration: z
                .number()
                .int()
                .min(0)
                .default(1000 * 60 * 60 * 2)
                .optional(),
            reason: z.string().optional()
        })
        .optional(),
    auto_role: z
        .object({
            enabled: z.boolean().optional().default(false),
            roles: z.array(zSnowflake).default([]),
            ignore_bots: z.boolean().optional().default(true)
        })
        .optional(),
    welcomer: z
        .object({
            enabled: z.boolean().default(false),
            custom_message: z.string().optional(),
            randomize: z.boolean().optional().default(false),
            mention: z.boolean().optional().default(false),
            say_hi_button: z
                .object({
                    enabled: z.boolean().optional().default(false),
                    label: z.string().optional().default("Say Hi"),
                    emoji: z.string().optional().default("👋"),
                    reply: z
                        .string()
                        .optional()
                        .default(":acc: said hi to you!"),
                    expire_after: z
                        .number()
                        .int()
                        .min(5_000)
                        .max(10 * 60_000)
                        .default(5 * 60_000)
                        .nullable()
                })
                .optional(),
            delete_after: z.number().int().optional(),
            channel: zSnowflake,
            force_embeds: z.boolean().default(true),
            forced_embed_color: z.number().int().optional()
        })
        .optional(),
    auto_triggers: z
        .object({
            enabled: z.boolean().default(false),
            triggers: z.array(TriggerSchema).default([]),
            global_disabled_channels: z.array(zSnowflake).default([])
        })
        .optional(),
    message_reporting: z
        .object({
            enabled: z.boolean().default(false),
            logging_channel: zSnowflake.optional(),
            users: z.array(zSnowflake).default([]),
            roles: z.array(zSnowflake).default([]),
            permissions: z.array(z.string()).default([]),
            permission_level: z
                .number()
                .int()
                .min(-1)
                .max(100)
                .default(-1)
                .optional(),
            action_required_permissions: z
                .object({
                    ban: z.array(z.string()).default(["BanMembers"]),
                    kick: z.array(z.string()).default(["KickMembers"]),
                    mute: z
                        .array(z.string())
                        .default(["or", "ModerateMembers", "ManageMessages"]),
                    warn: z
                        .array(z.string())
                        .default(["or", "ModerateMembers", "ManageMessages"]),
                    ignore: z
                        .array(z.string())
                        .default([
                            "or",
                            "ModerateMembers",
                            "ManageMessages",
                            "BanMembers",
                            "KickMembers"
                        ])
                })
                .prefault({})
        })
        .optional(),
    bump_reminder: z
        .object({
            enabled: z.boolean().optional(),
            disabled_channels: z.array(zSnowflake).default([]),
            remind_after: z
                .number()
                .int()
                .default(1000 * 60 * 60 * 2),
            reminder_content: z.string().min(1).optional(),
            on_bump_content: z.string().min(1).optional()
        })
        .optional()
});

export type GuildConfig = z.infer<typeof GuildConfigSchema>;
