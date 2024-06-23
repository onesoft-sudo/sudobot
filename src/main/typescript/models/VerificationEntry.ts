import { sql } from "drizzle-orm";
import { integer, json, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const verificationEntries = pgTable("verification_entries", {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull(),
    guildId: varchar("guild_id").notNull(),
    code: varchar("code").unique(),
    attempts: integer("attempts").default(0),
    metadata: json("metadata").default({}),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => sql`current_timestamp`)
});

export type VerificationEntry = typeof verificationEntries.$inferSelect;
export type VerificationEntryCreatePayload = typeof verificationEntries.$inferInsert;
