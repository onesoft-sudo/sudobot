import { pgEnum } from "@framework/database/Enum";
import { sql } from "drizzle-orm";
import { boolean, integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export enum PermissionLogicMode {
    And = "And",
    Or = "Or"
}

export const permissionLogicModeEnum = pgEnum("permission_logic_mode", PermissionLogicMode);

export const snippets = pgTable("snippets", {
    id: serial("id").primaryKey(),
    name: varchar("name"),
    userId: varchar("user_id").notNull(),
    guildId: varchar("guild_id").notNull(),
    aliases: varchar("aliases").notNull().array().default([]),
    roles: varchar("roles").notNull().array().default([]),
    channels: varchar("channels").notNull().array().default([]),
    users: varchar("users").notNull().array().default([]),
    attachments: varchar("attachments").notNull().array().default([]),
    content: varchar("content").notNull().array().default([]),
    randomize: boolean("randomize").default(false),
    permissions: varchar("permissions").notNull().array().default([]),
    permissionMode: permissionLogicModeEnum("permission_mode").default(PermissionLogicMode.And),
    level: integer("level"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => sql`current_timestamp`)
});

export type Snippet = typeof snippets.$inferSelect;
export type SnippetCreatePayload = typeof snippets.$inferInsert;
