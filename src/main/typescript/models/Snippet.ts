/*
* This file is part of SudoBot.
*
* Copyright (C) 2021-2024 OSN Developers.
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

import { pgEnum } from "@framework/database/Enum";
import { sql } from "drizzle-orm";
import { boolean, integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export enum PermissionLogicMode {
    And = "And",
    Or = "Or"
}

export const permissionLogicModeEnum = pgEnum("permission_logic_mode", PermissionLogicMode);

export const snippets = pgTable("snippets", {
    id: serial("id").primaryKey(),
    name: varchar("name"),
    userId: varchar("user_id").notNull(),
    guildId: varchar("guild_id").notNull(),
    aliases: varchar("aliases")
        .notNull()
        .array()
        .notNull()
        .default(sql`'{}'`),
    roles: varchar("roles")
        .notNull()
        .array()
        .notNull()
        .default(sql`'{}'`),
    channels: varchar("channels")
        .notNull()
        .array()
        .notNull()
        .default(sql`'{}'`),
    users: varchar("users")
        .notNull()
        .array()
        .notNull()
        .default(sql`'{}'`),
    attachments: varchar("attachments")
        .notNull()
        .array()
        .notNull()
        .default(sql`ARRAY[]::varchar[]`),
    content: varchar("content")
        .notNull()
        .array()
        .notNull()
        .default(sql`ARRAY[]::varchar[]`),
    randomize: boolean("randomize").notNull().default(false),
    permissions: varchar("permissions")
        .notNull()
        .array()
        .notNull()
        .default(sql`ARRAY[]::varchar[]`),
    permissionMode: permissionLogicModeEnum("permission_mode")
        .notNull()
        .default(PermissionLogicMode.And),
    level: integer("level"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date())
});

export type Snippet = typeof snippets.$inferSelect;
export type SnippetCreatePayload = typeof snippets.$inferInsert;
