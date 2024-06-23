import { sql } from "drizzle-orm";
import { boolean, integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const permissionLevels = pgTable("permission_levels", {
    id: serial("id").primaryKey(),
    guildId: varchar("guild_id").notNull(),
    level: integer("level").notNull(),
    disabled: boolean("disabled").default(false),
    grantedDiscordPermissions: text("granted_discord_permissions")
        .notNull()
        .array()
        .notNull()
        .default(sql`'{}'`),
    grantedSystemPermissions: text("granted_system_permissions")
        .notNull()
        .array()
        .notNull()
        .default(sql`'{}'`),
    roles: text("roles")
        .notNull()
        .array()
        .notNull()
        .default(sql`'{}'`),
    users: text("users")
        .notNull()
        .array()
        .notNull()
        .default(sql`'{}'`),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => sql`current_timestamp`)
});

export type PermissionLevel = typeof permissionLevels.$inferSelect;
export type PermissionLevelCreatePayload = typeof permissionLevels.$inferInsert;
