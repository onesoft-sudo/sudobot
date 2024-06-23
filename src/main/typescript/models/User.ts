import { sql } from "drizzle-orm";
import { integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    name: varchar("name"),
    username: varchar("username").notNull(),
    discordId: varchar("discord_id").notNull(),
    githubId: varchar("github_id"),
    guilds: varchar("guilds").notNull().array().default([]),
    password: varchar("password").notNull(),
    token: varchar("token"),
    recoveryToken: varchar("recovery_token"),
    recoveryCode: varchar("recovery_code"),
    recoveryAttempts: integer("recovery_attempts").default(0),
    recoveryTokenExpiresAt: timestamp("recovery_token_expires_at"),
    createdAt: timestamp("created_at").defaultNow(),
    tokenExpiresAt: timestamp("token_expires_at"),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => sql`current_timestamp`)
});

export type User = typeof users.$inferSelect;
export type UserCreatePayload = typeof users.$inferInsert;
