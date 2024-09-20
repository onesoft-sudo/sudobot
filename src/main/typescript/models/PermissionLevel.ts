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
import { boolean, integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const permissionLevels = pgTable("permission_levels", {
    id: serial("id").primaryKey(),
    guildId: varchar("guild_id").notNull(),
    level: integer("level").notNull(),
    disabled: boolean("disabled").default(false),
    grantedDiscordPermissions: text("granted_discord_permissions")
        .notNull()
        .array()
        .notNull()
        .default(sql`'{}'`),
    grantedSystemPermissions: text("granted_system_permissions")
        .notNull()
        .array()
        .notNull()
        .default(sql`'{}'`),
    roles: text("roles")
        .notNull()
        .array()
        .notNull()
        .default(sql`'{}'`),
    users: text("users")
        .notNull()
        .array()
        .notNull()
        .default(sql`'{}'`),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .$onUpdate(() => new Date())
});

export type PermissionLevel = typeof permissionLevels.$inferSelect;
export type PermissionLevelCreatePayload = typeof permissionLevels.$inferInsert;
