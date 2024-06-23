import { sql } from "drizzle-orm";
import { boolean, integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const afkEntries = pgTable("afk_entries", {
    id: serial("id").primaryKey(),
    reason: varchar("reason"),
    userId: varchar("user_id").notNull(),
    guildId: varchar("guild_id").notNull(),
    mentions: varchar("mentions").notNull().array().default([]),
    mentionCount: integer("mention_count").default(0),
    global: boolean("global").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => sql`current_timestamp`)
});

export type AFKEntry = typeof afkEntries.$inferSelect;
export type AFKEntryCreatePayload = typeof afkEntries.$inferInsert;
