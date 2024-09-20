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
import { integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    name: varchar("name"),
    username: varchar("username").notNull(),
    discordId: varchar("discord_id").notNull(),
    githubId: varchar("github_id"),
    guilds: varchar("guilds")
        .notNull()
        .array()
        .notNull()
        .default(sql`'{}'`),
    password: varchar("password").notNull(),
    token: varchar("token"),
    recoveryToken: varchar("recovery_token"),
    recoveryCode: varchar("recovery_code"),
    recoveryAttempts: integer("recovery_attempts").notNull().default(0),
    recoveryTokenExpiresAt: timestamp("recovery_token_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date())
});

export type User = typeof users.$inferSelect;
export type UserCreatePayload = typeof users.$inferInsert;
