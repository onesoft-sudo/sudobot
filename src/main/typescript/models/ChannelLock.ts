import { sql } from "drizzle-orm";
import { json, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const channelLocks = pgTable("channel_locks", {
    id: serial("id").primaryKey(),
    guildId: varchar("guild_id").notNull(),
    channelId: varchar("channel_id").notNull(),
    permissions: json("permissions").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => sql`current_timestamp`)
});

export type ChannelLock = typeof channelLocks.$inferSelect;
export type ChannelLockCreatePayload = typeof channelLocks.$inferInsert;
