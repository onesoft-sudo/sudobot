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

import { sql } from "drizzle-orm";
import { boolean, integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const reactionRoles = pgTable("reaction_roles", {
    id: serial("id").primaryKey(),
    emoji: varchar("emoji"),
    isBuiltInEmoji: boolean("is_built_in_emoji").notNull().default(false),
    guildId: varchar("guild_id").notNull(),
    channelId: varchar("channel_id").notNull(),
    messageId: varchar("message_id").notNull(),
    roles: varchar("roles")
        .notNull()
        .array()
        .notNull()
        .default(sql`'{}'`),
    requiredRoles: varchar("required_roles")
        .notNull()
        .array()
        .notNull()
        .default(sql`'{}'`),
    blacklistedUsers: varchar("blacklisted_users")
        .notNull()
        .array()
        .notNull()
        .default(sql`'{}'`),
    requiredPermissions: varchar("required_permissions")
        .notNull()
        .array()
        .notNull()
        .default(sql`'{}'`),
    level: integer("level"),
    single: boolean("single").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date())
});

export type ReactionRole = typeof reactionRoles.$inferSelect;
export type ReactionRoleCreatePayload = typeof reactionRoles.$inferInsert;
