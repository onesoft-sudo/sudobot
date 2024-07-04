import { sql } from "drizzle-orm";
import { boolean, integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const afkEntries = pgTable("afk_entries", {
    id: serial("id").primaryKey(),
    reason: varchar("reason"),
    userId: varchar("user_id").notNull(),
    guildId: varchar("guild_id").notNull(),
    mentions: varchar("mentions")
        .notNull()
        .array()
        .notNull()
        .default(sql`'{}'`),
    mentionCount: integer("mention_count").notNull().default(0),
    global: boolean("global").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date())
});

export type AFKEntry = typeof afkEntries.$inferSelect;
export type AFKEntryCreatePayload = typeof afkEntries.$inferInsert;
