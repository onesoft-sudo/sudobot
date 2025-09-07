import { Inject } from "@framework/container/Inject";
import { Override } from "@framework/decorators/Override";
import { Service } from "@framework/services/Service";
import { HasEventListeners } from "@framework/types/HasEventListeners";
import ConfigurationManager from "@sudobot/services/ConfigurationManager";
import { Message, Collection, Awaitable } from "discord.js";
import { CountingConfig } from "../schemas/CountingConfigSchema";
import { castDrizzle } from "../utils/castDrizzle";
import { countingEntries } from "../models/CountingEntry";
import { eq, sql } from "drizzle-orm";
import { Name } from "@framework/services/Name";
import { emoji } from "@sudobot/utils/emoji";

type CountCache = {
    count: number;
    lastUserId: string | null;
};

@Name("countingService")
class CountingService extends Service implements HasEventListeners {
    @Inject("configManager")
    private readonly configManager!: ConfigurationManager;

    private readonly currentCountCache = new Collection<string, CountCache>();

    private get drizzle() {
        return castDrizzle(this.application.database);
    }

    private getConfig(guildId: string) {
        return (this.configManager.config[guildId] as { counting?: CountingConfig } | null)?.counting;
    }

    public boot(): Awaitable<void> {
        setInterval(() => {
            this.currentCountCache.clear();
        }, 120_000);
    }

    private async getGuildCountInfo(guildId: string) {
        const cache = this.currentCountCache.get(guildId);

        if (cache !== undefined) {
            return cache;
        }

        const result = (
            await this.drizzle.select().from(countingEntries).where(eq(countingEntries.guildId, guildId)).limit(1)
        )?.[0];

        if (!result) {
            return null;
        }

        const newCache = {
            count: result.count,
            lastUserId: result.lastUserId
        };
        this.currentCountCache.set(guildId, newCache);
        return newCache;
    }

    @Override
    public async onMessageCreate(message: Message<boolean>) {
        if (!message.inGuild() || message.author.bot) {
            return;
        }

        const config = this.getConfig(message.guildId);

        if (!config?.enabled || message.channelId !== config.channel) {
            return;
        }

        if (!/^\d+$/.test(message.content)) {
            if (message.deletable) {
                message.delete().catch(this.application.logger.error);
            }

            this.application.logger.debug("Not a valid count message");
            return;
        }

        const countValue = +message.content;

        if (Number.isNaN(countValue) || countValue <= 0) {
            if (message.deletable) {
                message.delete().catch(this.application.logger.error);
            }

            this.application.logger.debug("Not a valid count message");
            return;
        }

        const countInfo = await this.getGuildCountInfo(message.guildId);

        if (!countInfo) {
            return;
        }

        if (countValue !== countInfo.count + 1) {
            if (message.deletable) {
                message.delete().catch(this.application.logger.error);
            }

            if (config.hardcore) {
                await this.drizzle
                    .update(countingEntries)
                    .set({ count: 0 })
                    .where(eq(countingEntries.guildId, message.guildId));

                countInfo.count = 0;
                countInfo.lastUserId = null;

                message.channel.send("The count has been reset.").catch(this.application.logger.error);
            }

            this.application.logger.debug(`Invalid count [Expected: ${countInfo.count + 1}, Actual: ${countValue}]`);
            return;
        }

        if (countInfo.lastUserId === message.author.id) {
            if (message.deletable) {
                message.delete().catch(this.application.logger.error);
            }

            this.application.logger.debug("This user cannot post counts multiple times in a row");
            return;
        }

        try {
            await this.drizzle
                .update(countingEntries)
                .set({ count: sql`${countingEntries.count} + 1` })
                .where(eq(countingEntries.guildId, message.guildId));

            countInfo.count++;
            countInfo.lastUserId = message.author.id;

            message.react(emoji(this.application, "check") || "☑️").catch(this.application.logger.error);
        } catch (error) {
            this.application.logger.error(error);
        }
    }
}

export default CountingService;
