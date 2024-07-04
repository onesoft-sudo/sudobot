import { integer, json, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const verificationEntries = pgTable("verification_entries", {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull(),
    guildId: varchar("guild_id").notNull(),
    code: varchar("code").notNull().unique(),
    attempts: integer("attempts").notNull().default(0),
    metadata: json("metadata").notNull().default({}),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date())
});

export type VerificationEntry = typeof verificationEntries.$inferSelect;
export type VerificationEntryCreatePayload = typeof verificationEntries.$inferInsert;
