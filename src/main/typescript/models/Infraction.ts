import { pgEnum } from "@framework/database/Enum";
import { sql } from "drizzle-orm";
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
    expiresAt: timestamp("expires_at"),
    metadata: json("metadata"),
    deliveryStatus: infractionDeliveryStatusEnum("delivery_status")
        .notNull()
        .default(InfractionDeliveryStatus.Success),
    queueId: integer("queue_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
        .notNull()
        .defaultNow()
        .$onUpdate(() => sql`current_timestamp`)
});

export type Infraction = typeof infractions.$inferSelect;
export type InfractionCreatePayload = typeof infractions.$inferInsert;
