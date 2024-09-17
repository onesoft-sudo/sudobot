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

import { pgEnum } from "@framework/database/Enum";
import { integer, json, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export enum InfractionType {
    Ban = "Ban",
    Kick = "Kick",
    Mute = "Mute",
    Warning = "Warning",
    MassBan = "MassBan",
    MassKick = "MassKick",
    Unban = "Unban",
    Unmute = "Unmute",
    BulkDeleteMessage = "BulkDeleteMessage",
    Timeout = "Timeout",
    TimeoutRemove = "TimeoutRemove",
    Bean = "Bean",
    Note = "Note",
    Role = "Role",
    ModMessage = "ModMessage",
    Shot = "Shot"
}

export enum InfractionDeliveryStatus {
    Success = "Success",
    Failed = "Failed",
    Fallback = "Fallback",
    NotDelivered = "NotDelivered"
}

export const infractionTypeEnum = pgEnum("infraction_type", InfractionType);
export const infractionDeliveryStatusEnum = pgEnum(
    "infraction_delivery_status",
    InfractionDeliveryStatus
);

export const infractions = pgTable("infractions", {
    id: serial("id").primaryKey(),
    type: infractionTypeEnum("type").notNull(),
    userId: varchar("user_id").notNull(),
    moderatorId: varchar("moderator_id").notNull(),
    guildId: varchar("guild_id").notNull(),
    reason: varchar("reason"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    metadata: json("metadata"),
    deliveryStatus: infractionDeliveryStatusEnum("delivery_status")
        .notNull()
        .default(InfractionDeliveryStatus.Success),
    queueId: integer("queue_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date())
});

export type Infraction = typeof infractions.$inferSelect;
export type InfractionCreatePayload = typeof infractions.$inferInsert;
