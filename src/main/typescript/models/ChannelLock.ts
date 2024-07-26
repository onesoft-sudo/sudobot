import { json, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const channelLocks = pgTable("channel_locks", {
    id: serial("id").primaryKey(),
    guildId: varchar("guild_id").notNull(),
    channelId: varchar("channel_id").notNull(),
    permissions: json("permissions").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .$onUpdate(() => new Date())
});

export type ChannelLock = typeof channelLocks.$inferSelect;
export type ChannelLockCreatePayload = typeof channelLocks.$inferInsert;
