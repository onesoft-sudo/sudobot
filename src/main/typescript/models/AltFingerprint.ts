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

import { integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export enum AltFingerprintType {
    CPUArchitecture,
    Canvas,
    WebGL,
    Audio,
    Fonts,
    Screen,
    CPUInfo,
    AdBlock,
    Language,
    Timezone,
    MediaDevices,
    UserAgent,
    _COUNT
}

export const altFingerprints = pgTable("alt_fingerprints", {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull(),
    fingerprint: varchar("fingerprint").notNull(),
    type: integer("type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date())
});

export type AltFingerprint = typeof altFingerprints.$inferSelect;
export type AltFingerprintCreatePayload = typeof altFingerprints.$inferInsert;
