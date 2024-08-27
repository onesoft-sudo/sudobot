import { pgEnum } from "@framework/database/Enum";
import { pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export enum VerificationMethod {
    ChannelInteraction = "channel_interaction",
    DMInteraction = "dm_interaction"
}

export const verificationMethodEnum = pgEnum("verification_method", VerificationMethod);

export const verificationRecords = pgTable("verification_records", {
    id: serial("id").primaryKey(),
    guildId: varchar("guild_id").notNull(),
    userId: varchar("user_id").notNull(),
    method: verificationMethodEnum("method").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date())
});

export type VerificationRecord = typeof verificationRecords.$inferSelect;
export type VerificationRecordCreatePayload = typeof verificationRecords.$inferInsert;
