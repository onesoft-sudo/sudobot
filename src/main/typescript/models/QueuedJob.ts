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

import {
    boolean,
    json,
    pgTable,
    serial,
    timestamp,
    varchar
} from "drizzle-orm/pg-core";

export const queuedJobs = pgTable("queued_jobs", {
    id: serial("id").primaryKey(),
    userId: varchar("user_id"),
    guildId: varchar("guild_id"),
    channelId: varchar("channel_id"),
    messageId: varchar("message_id"),
    name: varchar("name").notNull(),
    repeat: boolean("repeat").default(false),
    data: json("data"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
    runsAt: timestamp("runs_at", { withTimezone: true }).notNull()
});

export type QueuedJob = typeof queuedJobs.$inferSelect;
export type QueuedJobCreatePayload = typeof queuedJobs.$inferInsert;
