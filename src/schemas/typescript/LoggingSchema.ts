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

import { z } from "zod";
import { zSnowflake } from "./SnowflakeSchema";

export enum LogEventType {
    MessageDelete = "message_delete",
    MessageUpdate = "message_update",
    MessageDeleteBulk = "message_delete_bulk",
    MessageReactionClear = "message_reaction_clear",
    MemberBanAdd = "member_ban_add",
    MemberMassBan = "member_mass_ban",
    MemberMassUnban = "member_mass_unban",
    MemberMassKick = "member_mass_kick",
    MemberBanRemove = "member_ban_remove",
    GuildMemberAdd = "guild_member_add",
    GuildMemberRemove = "guild_member_remove",
    GuildMemberKick = "guild_member_kick",
    MemberMuteAdd = "member_mute_add",
    MemberMuteRemove = "member_mute_remove",
    MemberTimeoutAdd = "member_timeout_add",
    MemberTimeoutRemove = "member_timeout_remove",
    MemberWarningAdd = "member_warning_add",
    MemberModeratorMessageAdd = "member_mod_message_add",
    UserNoteAdd = "user_note_add",
    MemberRoleModification = "member_role_modification",
    SystemAutoModRuleModeration = "system_automod_rule_moderation",
    SystemUserMessageSave = "system_user_message_save",
    RaidAlert = "raid_alert",
    MemberNicknameModification = "member_nickname_modification",
    GuildVerificationAttempt = "guild_verification_attempt",
    GuildVerificationSuccess = "guild_verification_success",
    GuildVerificationNotEnoughInfo = "guild_verification_not_enough_info",
    NewMemberMessageInspection = "NewMemberMessageInspectionLog",
    MemberVoiceChannelJoin = "memebr_voice_channel_join",
    MemberVoiceChannelLeave = "memebr_voice_channel_leave",
}

const LogEventSchema = z.enum(
    Object.values({
        ...LogEventType
    }) as unknown as [LogEventType, ...LogEventType[]]
);

const LogConfigOverride = z
    .object({
        events: z.array(LogEventSchema).nonempty(),
        enabled: z.literal(true),
        channel: zSnowflake
    })
    .or(
        z.object({
            events: z.array(LogEventSchema).nonempty(),
            enabled: z.literal(false)
        })
    );

const LoggingExclusionSchema = z.object({
    type: z.enum(["user", "channel", "category_channel"]),
    mode: z.enum(["exclude", "include"]).default("exclude"),
    snowflakes: z.array(zSnowflake),
    events: z.array(LogEventSchema).optional()
});

export type LoggingExclusionType = z.infer<typeof LoggingExclusionSchema>;

export const LoggingSchema = z.object({
    enabled: z.boolean().default(false),
    bulk_delete_send_json: z.boolean().default(true),
    global_ignored_channels: z.array(zSnowflake).default([]),
    default_enabled: z
        .boolean()
        .default(true)
        .describe("Whether to consider all events as enabled if no override is found"),
    primary_channel: zSnowflake.optional(),
    hooks: z.record(zSnowflake, zSnowflake).default({}),
    overrides: z.array(LogConfigOverride).default([]),
    exclusions: z.array(LoggingExclusionSchema).default([]),
    unsubscribed_events: z.array(LogEventSchema).default([])
});
