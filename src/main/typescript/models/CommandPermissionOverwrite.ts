/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
 *
 * SudoBot is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SudoBot is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
 */

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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date())
});

export type CommandPermissionOverwrite = typeof commandPermissionOverwrites.$inferSelect;
export type CommandPermissionOverwriteCreatePayload =
    typeof commandPermissionOverwrites.$inferInsert;
