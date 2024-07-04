import { sql } from "drizzle-orm";
import { boolean, integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const reactionRoles = pgTable("reaction_roles", {
    id: serial("id").primaryKey(),
    emoji: varchar("emoji"),
    isBuiltInEmoji: boolean("is_built_in_emoji").notNull().default(false),
    guildId: varchar("guild_id").notNull(),
    channelId: varchar("channel_id").notNull(),
    messageId: varchar("message_id").notNull(),
    roles: varchar("roles")
        .notNull()
        .array()
        .notNull()
        .default(sql`'{}'`),
    requiredRoles: varchar("required_roles")
        .notNull()
        .array()
        .notNull()
        .default(sql`'{}'`),
    blacklistedUsers: varchar("blacklisted_users")
        .notNull()
        .array()
        .notNull()
        .default(sql`'{}'`),
    requiredPermissions: varchar("required_permissions")
        .notNull()
        .array()
        .notNull()
        .default(sql`'{}'`),
    level: integer("level"),
    single: boolean("single").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date())
});

export type ReactionRole = typeof reactionRoles.$inferSelect;
export type ReactionRoleCreatePayload = typeof reactionRoles.$inferInsert;
