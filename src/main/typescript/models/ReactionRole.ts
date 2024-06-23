import { sql } from "drizzle-orm";
import { boolean, integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const reactionRoles = pgTable("reaction_roles", {
    id: serial("id").primaryKey(),
    emoji: varchar("emoji"),
    isBuiltInEmoji: boolean("is_built_in_emoji").default(false),
    guildId: varchar("guild_id").notNull(),
    channelId: varchar("channel_id").notNull(),
    messageId: varchar("message_id").notNull(),
    roles: varchar("roles").notNull().array().default([]),
    requiredRoles: varchar("required_roles").notNull().array().default([]),
    blacklistedUsers: varchar("blacklisted_users").notNull().array().default([]),
    requiredPermissions: varchar("required_permissions").notNull().array().default([]),
    level: integer("level"),
    single: boolean("single").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => sql`current_timestamp`)
});

export type ReactionRole = typeof reactionRoles.$inferSelect;
export type ReactionRoleCreatePayload = typeof reactionRoles.$inferInsert;
