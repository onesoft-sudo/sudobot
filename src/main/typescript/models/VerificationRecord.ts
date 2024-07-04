import { pgEnum } from "@framework/database/Enum";
import { pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export enum VerificationMethod {
    Discord = "discord",
    GitHub = "github",
    Google = "google",
    Email = "email"
}

export const verificationMethodEnum = pgEnum("verification_method", VerificationMethod);

export const verificationRecords = pgTable("verification_records", {
    id: serial("id").primaryKey(),
    guildId: varchar("guild_id").notNull(),
    userId: varchar("user_id").notNull(),
    discordId: varchar("discord_id"),
    githubId: varchar("github_id"),
    googleId: varchar("google_id"),
    email: varchar("email"),
    method: verificationMethodEnum("method").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date())
});

export type VerificationRecord = typeof verificationRecords.$inferSelect;
export type VerificationRecordCreatePayload = typeof verificationRecords.$inferInsert;
