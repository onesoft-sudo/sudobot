import { sql } from "drizzle-orm";
import { pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const muteRecords = pgTable("mute_records", {
    id: serial("id").primaryKey(),
    memberId: varchar("member_id").notNull(),
    guildId: varchar("guild_id").notNull(),
    roles: varchar("roles")
        .notNull()
        .array()
        .notNull()
        .default(sql`'{}'`),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .$onUpdate(() => new Date())
});

export type MuteRecord = typeof muteRecords.$inferSelect;
export type MuteRecordCreatePayload = typeof muteRecords.$inferInsert;
