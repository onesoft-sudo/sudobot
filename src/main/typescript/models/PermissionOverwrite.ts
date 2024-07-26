import { sql } from "drizzle-orm";
import { boolean, integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const permissionOverwrites = pgTable("permission_overwrites", {
    id: serial("id").primaryKey(),
    name: text("name"),
    guildId: varchar("guild_id").notNull(),
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
    priority: integer("priority").notNull().default(0),
    merge: boolean("merge").notNull().default(true),
    disabled: boolean("disabled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .$onUpdate(() => new Date())
});

export type PermissionOverwrite = typeof permissionOverwrites.$inferSelect;
export type PermissionOverwriteCreatePayload = typeof permissionOverwrites.$inferInsert;
