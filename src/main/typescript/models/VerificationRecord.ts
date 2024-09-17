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
import { pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export enum VerificationMethod {
    ChannelInteraction = "channel_interaction",
    DMInteraction = "dm_interaction"
}

export const verificationMethodEnum = pgEnum("verification_method", VerificationMethod);

export const verificationRecords = pgTable("verification_records", {
    id: serial("id").primaryKey(),
    guildId: varchar("guild_id").notNull(),
    userId: varchar("user_id").notNull(),
    method: verificationMethodEnum("method").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date())
});

export type VerificationRecord = typeof verificationRecords.$inferSelect;
export type VerificationRecordCreatePayload = typeof verificationRecords.$inferInsert;
