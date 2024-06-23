import { pgEnum } from "@framework/database/Enum";
import { sql } from "drizzle-orm";
import {
    boolean,
    integer,
    json,
    pgTable,
    serial,
    text,
    timestamp,
    varchar
} from "drizzle-orm/pg-core";

export enum CommandPermissionOverwriteAction {
    Allow = "Allow",
    Deny = "Deny"
}

export const commandPermissionOverwriteActionEnum = pgEnum(
    "command_permission_overwrite_action",
    CommandPermissionOverwriteAction
);

export const commandPermissionOverwrites = pgTable("command_permission_overwrites", {
    id: serial("id").primaryKey(),
    guildId: varchar("guild_id").notNull(),
    commands: text("commands")
        .notNull()
        .array()
        .notNull()
        .default(sql`'{}'`),
    requiredDiscordPermissions: json("required_discord_permissions").default(null),
    requiredSystemPermissions: json("required_system_permissions").default(null),
    requiredRoles: json("required_roles").default(null),
    requiredUsers: json("required_users").default(null),
    requiredChannels: json("required_channels").default(null),
    requiredLevel: integer("required_level"),
    disabled: boolean("disabled").default(false),
    onMatch: commandPermissionOverwriteActionEnum("on_match")
        .notNull()
        .default(CommandPermissionOverwriteAction.Allow),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
        .notNull()
        .defaultNow()
        .$onUpdate(() => sql`current_timestamp`)
});

export type CommandPermissionOverwrite = typeof commandPermissionOverwrites.$inferSelect;
export type CommandPermissionOverwriteCreatePayload =
    typeof commandPermissionOverwrites.$inferInsert;
