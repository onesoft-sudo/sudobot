/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025, 2026 OSN Developers.
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

import Service from "@framework/services/Service";
import type { HasEventListeners } from "@framework/types/HasEventListeners";
import { Colors } from "@main/constants/Colors";
import type Application from "@main/core/Application";
import type { AFKEntry } from "@main/models/AFKEntry";
import { afkEntries } from "@main/models/AFKEntry";
import { formatDistanceToNowStrict } from "date-fns";
import type {
    Message,
    Snowflake} from "discord.js";
import {
    Collection,
    escapeMarkdown,
    messageLink,
    time
} from "discord.js";
import { and, eq } from "drizzle-orm";
import { LRUCache } from "lru-cache";

export const SERVICE_AWAY_FROM_KEYBOARD = "awayFromKeyboardService" as const;

const SYMBOL_NO_ENTRY = Symbol("NO_ENTRY");

class AwayFromKeyboardService extends Service implements HasEventListeners {
    public override readonly name: string = SERVICE_AWAY_FROM_KEYBOARD;
    declare protected readonly application: Application;

    protected readonly guildCache = new Collection<
        string,
        LRUCache<Snowflake, AFKEntry | typeof SYMBOL_NO_ENTRY>
    >();

    protected readonly LRU_OPTIONS = {
        max: 15000,
        ttl: 1000 * 60 * 60
    };

    protected readonly modified = new Collection<
        `${string}::${Snowflake}`,
        Pick<AFKEntry, "reason" | "mentions" | "mentionCount">
    >();

    protected timeout?: ReturnType<typeof setTimeout>;

    public getGuildCache(guildId: string) {
        let cache = this.guildCache.get(guildId);

        if (!cache) {
            cache = new LRUCache<Snowflake, AFKEntry | typeof SYMBOL_NO_ENTRY>(
                this.LRU_OPTIONS
            );
            this.guildCache.set(guildId, cache);
        }

        return cache;
    }

    public async setAFK({ guildId, reason, userId }: SetAFKOptions) {
        const cache = this.getGuildCache(guildId);

        if (!cache.get(userId)) {
            return null;
        }

        const [entry] = await this.application.database.drizzle
            .insert(afkEntries)
            .values({
                reason,
                guildId,
                userId
            })
            .onConflictDoNothing()
            .returning();

        if (!entry) {
            const existingEntry = await this.fetchEntry(guildId, userId);

            if (!existingEntry) {
                this.application.logger.debug(
                    "AFK entry insertion conflict yet no records found. This suggests an internal bug."
                );

                return null;
            }

            return existingEntry;
        }

        cache.set(userId, entry);
        return entry;
    }

    protected async fetchEntry(guildId: Snowflake, userId: Snowflake) {
        const existingEntry =
            await this.application.database.query.afkEntries.findFirst({
                where: and(
                    eq(afkEntries.guildId, guildId),
                    eq(afkEntries.userId, userId)
                )
            });

        if (!existingEntry) {
            this.getGuildCache(guildId).set(userId, SYMBOL_NO_ENTRY);
            return null;
        }

        this.getGuildCache(guildId).set(userId, existingEntry);
        return existingEntry;
    }

    public async isAFK(userId: Snowflake, guildId: Snowflake) {
        const cache = this.getGuildCache(guildId);
        const entry = cache.get(userId);

        if (entry === SYMBOL_NO_ENTRY) {
            return false;
        }

        if (entry) {
            return true;
        }

        if (await this.fetchEntry(guildId, userId)) {
            return true;
        }

        return false;
    }

    public async getAFKEntry(userId: Snowflake, guildId: Snowflake) {
        const cache = this.getGuildCache(guildId);
        const entry = cache.get(userId);

        if (entry === SYMBOL_NO_ENTRY) {
            return null;
        }

        if (entry) {
            return entry;
        }

        return await this.fetchEntry(guildId, userId);
    }

    public async removeGuildAFKs(guildId: Snowflake) {
        const { rowCount } = await this.application.database.drizzle
            .delete(afkEntries)
            .where(eq(afkEntries.guildId, guildId));

        const cache = this.getGuildCache(guildId);
        cache.clear();
        this.guildCache.delete(guildId);

        this.application.logger.debug(
            `Removed ${rowCount} AFK entries for guild ${guildId}.`
        );

        return rowCount;
    }

    public async removeAFK(
        userId: Snowflake,
        guildId: Snowflake
    ): Promise<AFKEntry | undefined> {
        const cache = this.getGuildCache(guildId);

        if (cache.get(userId) === SYMBOL_NO_ENTRY) {
            return;
        }

        cache.delete(userId);

        const deleted = await this.application.database.drizzle
            .delete(afkEntries)
            .where(
                and(
                    eq(afkEntries.guildId, guildId),
                    eq(afkEntries.userId, userId)
                )
            )
            .returning();

        cache.set(userId, SYMBOL_NO_ENTRY);
        return deleted[0];
    }

    private queueSync() {
        this.timeout ??= setTimeout(async () => {
            for (const [key, { reason, mentions, mentionCount }] of this
                .modified) {
                const [guildId, userId] = key.split("::") as [
                    Snowflake,
                    Snowflake
                ];

                const cache = this.getGuildCache(guildId);
                const entry = cache.get(userId);

                if (!entry || entry === SYMBOL_NO_ENTRY) {
                    continue;
                }

                await this.application.database.drizzle
                    .update(afkEntries)
                    .set({
                        reason,
                        mentions,
                        mentionCount
                    })
                    .where(
                        and(
                            entry ? eq(afkEntries.id, entry.id) : undefined,
                            eq(afkEntries.userId, userId),
                            eq(afkEntries.guildId, guildId)
                        )
                    )
                    .catch(this.application.logger.error);
            }

            this.modified.clear();
            this.timeout = undefined;
        }, 10_000);
    }

    public async addMention({
        guildId,
        mentionFromId,
        userId,
        channelId,
        messageId
    }: AddMentionOptions) {
        const cache = this.getGuildCache(guildId);
        let entry = cache.get(userId) ?? null;

        if (entry === SYMBOL_NO_ENTRY) {
            return null;
        }

        if (!entry) {
            entry = await this.fetchEntry(guildId, userId);

            if (!entry) {
                return null;
            }
        }

        entry.mentionCount++;

        if (entry.mentions.length >= 25) {
            entry.mentions.shift();
        }

        entry.mentions.unshift(
            `${mentionFromId}::${guildId}::${channelId}::${messageId}::${new Date().toISOString()}`
        );

        this.modified.set(`${guildId}::${userId}`, {
            mentionCount: entry.mentionCount,
            mentions: entry.mentions,
            reason: entry.reason
        });

        this.queueSync();
        return entry;
    }

    public generateAFKSummary(global: AFKEntry, guild?: AFKEntry): string;
    public generateAFKSummary(
        global: AFKEntry | undefined,
        guild: AFKEntry
    ): string;

    public generateAFKSummary(entry: AFKEntry) {
        let description = `You're no longer AFK. You've had **${entry.mentionCount ?? 0}** mentions total.\n`;
        let mentions = "";
        let count = 0;

        for (const mentionString of entry.mentions) {
            mentions += this.formatMentionString(mentionString);

            if (++count >= 25) {
                break;
            }
        }

        if (mentions !== "") {
            description += "Your last mentions in this server are:\n\n";
            description += mentions + "\n";
        }

        description += `You were AFK for __${formatDistanceToNowStrict(new Date(entry.createdAt))}__.`;
        return description;
    }

    public async onMessageCreate(message: Message<boolean>) {
        const entry = await this.removeAFK(
            message.author.id,
            message.guildId || `gc_${message.channelId}`
        );

        if (entry) {
            await message.reply({
                embeds: [
                    {
                        description: this.generateAFKSummary(entry),
                        color: Colors.Primary
                    }
                ],
                allowedMentions: {
                    parse: [],
                    repliedUser: false,
                    roles: [],
                    users: []
                }
            });
        }

        const afkUsers = [];

        for (const mentionedUser of message.mentions.users.values()) {
            if (mentionedUser.bot) {
                continue;
            }

            const cache = this.getGuildCache(
                message.guildId || `gc_${message.channelId}`
            );

            const guildAFK = cache.get(mentionedUser.id);

            if (guildAFK !== SYMBOL_NO_ENTRY) {
                const entry = await this.addMention({
                    userId: mentionedUser.id,
                    mentionFromId: message.author.id,
                    guildId: message.guildId || `gc_${message.channelId}`,
                    channelId: message.channelId,
                    messageId: message.id
                });

                if (!entry) {
                    continue;
                }

                afkUsers.push({
                    reason: entry.reason,
                    id: mentionedUser.id,
                    createdAt: entry.createdAt
                });
            }
        }

        if (afkUsers.length === 0) {
            return;
        }

        if (afkUsers.length === 1) {
            await message.reply({
                embeds: [
                    {
                        description: `<@${afkUsers[0].id}> is AFK${afkUsers[0].reason ? `, for reason: **${escapeMarkdown(afkUsers[0].reason)}**` : ""} - ${time(afkUsers[0].createdAt, "R")}.`,
                        color: Colors.Primary
                    }
                ]
            });
        } else {
            let description = "The following users are AFK right now:\n\n";

            for (const user of afkUsers) {
                description += `- <@${user.id}> - ${time(user.createdAt, "R")}${user.reason ? `, with reason: **${escapeMarkdown(user.reason)}**.` : "."}\n`;
            }

            await message.reply({
                embeds: [
                    {
                        description,
                        color: Colors.Primary
                    }
                ]
            });
        }
    }

    private formatMentionString(mentionString: string) {
        const [mentionId, guildId, channelId, messageId, timestamp] =
            mentionString.split("::") as [
                Snowflake,
                Snowflake,
                Snowflake,
                Snowflake,
                string
            ];

        return `- By <@${mentionId}> - ${time(new Date(timestamp), "R")} - [Navigate](${messageLink(channelId, messageId, guildId)})\n`;
    }
}

type SetAFKOptions = {
    userId: Snowflake;
    reason: string | undefined;
    guildId: Snowflake;
};

type AddMentionOptions = {
    userId: Snowflake;
    mentionFromId: Snowflake;
    guildId: Snowflake;
    channelId: Snowflake;
    messageId: Snowflake;
};

export default AwayFromKeyboardService;
