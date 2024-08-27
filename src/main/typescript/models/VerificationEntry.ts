import { integer, json, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { verificationMethodEnum } from "./VerificationRecord";

export const verificationEntries = pgTable("verification_entries", {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull(),
    guildId: varchar("guild_id").notNull(),
    token: varchar("code").notNull().unique(),
    attempts: integer("attempts").notNull().default(0),
    metadata: json("metadata").notNull().default({}),
    method: verificationMethodEnum("method").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date())
});

export type VerificationEntry = typeof verificationEntries.$inferSelect;
export type VerificationEntryCreatePayload = typeof verificationEntries.$inferInsert;
