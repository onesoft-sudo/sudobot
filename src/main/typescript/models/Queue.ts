import { boolean, json, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const queues = pgTable("queues", {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull(),
    guildId: varchar("guild_id").notNull(),
    channelId: varchar("channel_id"),
    messageId: varchar("message_id"),
    name: varchar("name").notNull(),
    repeat: boolean("repeat").default(false),
    data: json("data").default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date()),
    runsAt: timestamp("runs_at")
});

export type Queue = typeof queues.$inferSelect;
export type QueueCreatePayload = typeof queues.$inferInsert;
