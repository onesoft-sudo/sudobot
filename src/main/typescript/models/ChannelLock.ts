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

import { json, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const channelLocks = pgTable("channel_locks", {
    id: serial("id").primaryKey(),
    guildId: varchar("guild_id").notNull(),
    channelId: varchar("channel_id").notNull(),
    permissions: json("permissions").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .$onUpdate(() => new Date())
});

export type ChannelLock = typeof channelLocks.$inferSelect;
export type ChannelLockCreatePayload = typeof channelLocks.$inferInsert;
