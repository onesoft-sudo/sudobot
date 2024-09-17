/*
* This file is part of SudoBot.
*
* Copyright (C) 2021-2024 OSN Developers.
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

import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { HasEventListeners } from "@framework/types/HasEventListeners";
import { Colors } from "@main/constants/Colors";
import { afkEntries, AFKEntry } from "@main/models/AFKEntry";
import { formatDistanceToNowStrict } from "date-fns";
import { Collection, escapeMarkdown, Message, messageLink, Snowflake, time } from "discord.js";
import { and, eq, inArray } from "drizzle-orm";

@Name("afkService")
class AFKService extends Service implements HasEventListeners {
    public readonly cache = new Collection<`${Snowflake | "global"}::${Snowflake}`, AFKEntry>();
    protected readonly modified = new Set<`${Snowflake | "global"}::${Snowflake}`>();
    protected timeout?: ReturnType<typeof setTimeout>;

    public override async boot(): Promise<void> {
        const entries = await this.application.database.query.afkEntries.findMany();

        for (const entry of entries) {
            this.cache.set(`${entry.guildId}::${entry.userId}`, entry);
        }

        this.application.logger.info(`Synced ${entries.length} AFK entries.`);
    }

    public async setAFK({ guildId, reason, userId }: SetAFKOptions) {
        const key = `${guildId}::${userId}` as const;

        if (this.cache.has(key)) {
            return null;
        }

        const [entry] = await this.application.database.drizzle
            .insert(afkEntries)
            .values({
                reason,
                global: guildId === "global",
                guildId,
                userId
            })
            .returning();

        this.cache.set(key, entry);
        return entry;
    }

    public isAFK(userId: Snowflake, guildId: Snowflake | "global") {
        const key = `${guildId}::${userId}` as const;
        return this.cache.has(key);
    }

    public getAFK(userId: Snowflake, guildId: Snowflake | "global") {
        const key = `${guildId}::${userId}` as const;
        return this.cache.get(key);
    }

    public async removeGuildAFKs(guildId: Snowflake) {
        const ids = [];

        for (const entry of this.cache.values()) {
            if (entry.global || entry.guildId !== guildId) {
                continue;
            }

            ids.push(entry.id);
            this.cache.delete(`${guildId}::${entry.userId}`);
        }

        if (ids.length === 0) {
            return 0;
        }

        await this.application.database.drizzle
            .delete(afkEntries)
            .where(inArray(afkEntries.id, ids));

        this.application.logger.debug(`Removed ${ids.length} AFK entries for guild ${guildId}.`);
        return ids.length;
    }

    public async removeAFK(userId: Snowflake, guildId: Snowflake) {
        const globalEntry = this.cache.get(`global::${userId}`);
        const guildEntry = this.cache.get(`${guildId}::${userId}`);

        if (!globalEntry && !guildEntry) {
            return {
                global: null,
                guild: null
            };
        }

        const list = [];

        if (globalEntry) {
            list.push(globalEntry.id);
            this.cache.delete(`global::${userId}`);
        }

        if (guildEntry) {
            list.push(guildEntry.id);
            this.cache.delete(`${guildId}::${userId}`);
        }

        await this.application.database.drizzle
            .delete(afkEntries)
            .where(inArray(afkEntries.id, list));

        return {
            global: globalEntry,
            guild: guildEntry
        };
    }

    private queueSync() {
        this.timeout ??= setTimeout(async () => {
            for (const key of this.modified) {
                const [guildId, userId] = key.split("::") as [Snowflake | "global", Snowflake];
                const entry = this.cache.get(key);

                if (!entry) {
                    continue;
                }

                await this.application.database.drizzle
                    .update(afkEntries)
                    .set({
                        reason: entry.reason,
                        mentions: entry.mentions,
                        mentionCount: entry.mentionCount
                    })
                    .where(
                        and(
                            eq(afkEntries.id, entry.id),
                            eq(afkEntries.userId, userId),
                            eq(afkEntries.guildId, guildId)
                        )
                    )
                    .catch(this.application.logger.error);
            }

            this.modified.clear();
        }, 7_000);
    }

    public async addMention({
        guildId,
        mentionId,
        userId,
        channelId,
        messageId,
        global
    }: AddMentionOptions) {
        const key = `${global ? "global" : guildId}::${userId}` as const;
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        entry.mentionCount++;

        if (entry.mentions.length >= 25) {
            entry.mentions.shift();
        }

        entry.mentions.push(
            `${mentionId}::${guildId}::${channelId}::${messageId}::${new Date().toISOString()}`
        );

        this.modified.add(key);
        this.queueSync();
        return entry;
    }

    public async switchContext(userId: Snowflake, guildId: Snowflake | "global") {
        const globalEntry = this.cache.get(`global::${userId}`);
        const guildEntry = this.cache.get(`${guildId}::${userId}`);

        if (!globalEntry && !guildEntry) {
            return null;
        }

        const entry = globalEntry ?? guildEntry;

        if (entry) {
            await this.application.database.drizzle
                .update(afkEntries)
                .set({
                    global: !entry.global,
                    guildId
                })
                .where(and(eq(afkEntries.global, !entry.global), eq(afkEntries.guildId, guildId)));

            this.cache.delete(`${entry.global ? "global" : guildId}::${userId}`);
            this.cache.set(`${guildId}::${userId}`, {
                ...entry,
                global: !entry.global,
                guildId
            });
        }

        return entry;
    }

    public generateAFKSummary(global: AFKEntry, guild?: AFKEntry): string;
    public generateAFKSummary(global: AFKEntry | undefined, guild: AFKEntry): string;

    public generateAFKSummary(global?: AFKEntry, guild?: AFKEntry) {
        let description = `You're no longer AFK. You've had **${(global?.mentionCount ?? 0) + (guild?.mentionCount ?? 0)}** mentions total.\n`;
        let mentions = "";
        let count = 0;

        if (global) {
            for (const mentionString of global.mentions) {
                mentions += this.formatMentionString(mentionString);

                if (++count >= 25) {
                    break;
                }
            }
        }

        if (guild) {
            for (const mentionString of guild.mentions) {
                mentions += this.formatMentionString(mentionString);

                if (++count >= 25) {
                    break;
                }
            }
        }

        if (mentions !== "") {
            description += "Your last 25 mentions in both global and guild-local records are:\n\n";
            description += mentions + "\n";
        }

        description += `You were AFK for __${formatDistanceToNowStrict(new Date(global?.createdAt ?? guild!.createdAt))}__.`;
        return description;
    }

    public async onMessageCreate(message: Message<true>) {
        if (message.author.bot) {
            return;
        }

        const { global, guild } = await this.removeAFK(message.author.id, message.guildId);

        if (global || guild) {
            await message.reply({
                embeds: [
                    {
                        description: this.generateAFKSummary(global, guild!),
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

            const globalAFK = this.cache.get(`global::${mentionedUser.id}`);
            const guildAFK = this.cache.get(`${message.guildId}::${mentionedUser.id}`);

            if (globalAFK || guildAFK) {
                await this.addMention({
                    userId: mentionedUser.id,
                    mentionId: message.author.id,
                    guildId: message.guildId,
                    global: !!globalAFK,
                    channelId: message.channelId,
                    messageId: message.id
                });

                afkUsers.push({
                    reason: globalAFK ? globalAFK.reason : guildAFK!.reason,
                    id: mentionedUser.id,
                    createdAt: globalAFK ? globalAFK.createdAt : guildAFK!.createdAt
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
        const [mentionId, guildId, channelId, messageId, timestamp] = mentionString.split("::") as [
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
    guildId: Snowflake | "global";
};

type AddMentionOptions = {
    userId: Snowflake;
    mentionId: Snowflake;
    guildId: Snowflake;
    global: boolean;
    channelId: Snowflake;
    messageId: Snowflake;
};

export default AFKService;
