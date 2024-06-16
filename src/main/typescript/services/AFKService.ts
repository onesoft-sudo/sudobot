import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { HasEventListeners } from "@framework/types/HasEventListeners";
import { Colors } from "@main/constants/Colors";
import { AfkEntry } from "@prisma/client";
import { formatDistanceToNowStrict } from "date-fns";
import { Collection, escapeMarkdown, Message, messageLink, Snowflake, time } from "discord.js";

@Name("afkService")
class AFKService extends Service implements HasEventListeners {
    public readonly cache = new Collection<`${Snowflake | "global"}::${Snowflake}`, AfkEntry>();
    protected readonly modified = new Set<`${Snowflake | "global"}::${Snowflake}`>();
    protected timeout?: ReturnType<typeof setTimeout>;

    public override async boot(): Promise<void> {
        const entries = await this.application.prisma.afkEntry.findMany();

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

        const entry = await this.application.prisma.afkEntry.create({
            data: {
                reason,
                global: guildId === "global",
                guildId,
                userId
            }
        });

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

        await this.application.prisma.afkEntry.deleteMany({
            where: {
                id: {
                    in: ids
                }
            }
        });

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

        const inArray = [];

        if (globalEntry) {
            inArray.push(globalEntry.id);
            this.cache.delete(`global::${userId}`);
        }

        if (guildEntry) {
            inArray.push(guildEntry.id);
            this.cache.delete(`${guildId}::${userId}`);
        }

        await this.application.prisma.afkEntry.deleteMany({
            where: {
                id: {
                    in: inArray
                }
            }
        });

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

                await this.application.prisma.afkEntry
                    .update({
                        where: {
                            id: entry.id,
                            guildId,
                            userId
                        },
                        data: {
                            reason: entry.reason,
                            mentions: entry.mentions,
                            mentionCount: entry.mentionCount
                        }
                    })
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
            await this.application.prisma.afkEntry.update({
                where: {
                    id: entry.id
                },
                data: {
                    global: !entry.global,
                    guildId
                }
            });

            this.cache.delete(`${entry.global ? "global" : guildId}::${userId}`);
            this.cache.set(`${guildId}::${userId}`, {
                ...entry,
                global: !entry.global,
                guildId
            });
        }

        return entry;
    }

    public generateAFKSummary(global: AfkEntry, guild?: AfkEntry): string;
    public generateAFKSummary(global: AfkEntry | undefined, guild: AfkEntry): string;

    public generateAFKSummary(global?: AfkEntry, guild?: AfkEntry) {
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
