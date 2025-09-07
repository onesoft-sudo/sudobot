import { integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const countingEntries = pgTable("counting_entries", {
    id: serial("id").primaryKey(),
    lastUserId: varchar("last_user_id"),
    guildId: varchar("guild_id").notNull(),
    count: integer("count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date())
});

export type CountingEntry = typeof countingEntries.$inferSelect;
export type CountingEntryCreatePayload = typeof countingEntries.$inferInsert;
