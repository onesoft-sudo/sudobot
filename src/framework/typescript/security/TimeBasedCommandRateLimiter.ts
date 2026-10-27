import type Command from "@framework/commands/Command.js";
import type Context from "@framework/commands/Context.js";
import type { CommandRateLimitConfiguration } from "@framework/security/CommandRateLimitConfiguration.js";
import type CommandRateLimiter from "@framework/security/CommandRateLimiter.js";
import CommandRateLimitError from "@framework/security/CommandRateLimitError.js";
import type { Awaitable, Snowflake } from "discord.js";
import { Collection } from "discord.js";

type CommandHit = {
    count: number;
    firstHitTimestamp: number;
    lastHitTimestamp: number;
    config: Readonly<CommandRateLimitConfiguration>;
};

class TimeBasedCommandRateLimiter implements CommandRateLimiter {
    protected readonly globalHits = new Collection<string, CommandHit>();
    protected readonly localHits = new Collection<`${"g" | "c"}::${Snowflake}::${string}`, CommandHit>();
    protected readonly defaultConfiguration: Readonly<CommandRateLimitConfiguration>;

    public constructor(defaultConfiguration: CommandRateLimitConfiguration) {
        this.defaultConfiguration = defaultConfiguration;

        setInterval(() => {
            this.localHits.sweep(hit => {
                if (Date.now() - hit.lastHitTimestamp > hit.config.timeframe) {
                    return true;
                }

                return false;
            });
        }, 60_000);

        setInterval(() => {
            this.globalHits.sweep(hit => {
                if (Date.now() - hit.lastHitTimestamp > hit.config.timeframe) {
                    return true;
                }

                return false;
            });
        }, 30_000);
    }

    protected async getLocalHit(command: Command, context: Context) {
        let hit = this.localHits.get(
            `${context.guildId ? (`g::${context.guildId}` as const) : (`c::${context.channelId}` as const)}::${command.name}`
        );

        if (hit && Date.now() - hit.firstHitTimestamp <= hit.config.timeframe) {
            return hit;
        }

        hit = await this.initializeLocalHit(command, context);
        this.localHits.set(
            `${context.guildId ? (`g::${context.guildId}` as const) : (`c::${context.channelId}` as const)}::${command.name}`,
            hit
        );

        return hit;
    }

    protected async getGlobalHit(command: Command) {
        let hit = this.globalHits.get(command.name);

        if (hit && Date.now() - hit.firstHitTimestamp <= hit.config.timeframe) {
            return hit;
        }

        hit = await this.initializeGlobalHit(command);
        this.globalHits.set(command.name, hit);
        return hit;
    }

    protected initializeGlobalHit(command: Command): Awaitable<CommandHit> {
        const now = Date.now();

        return {
            count: 0,
            firstHitTimestamp: now,
            lastHitTimestamp: now,
            config: command.ratelimit ?? this.defaultConfiguration
        };
    }

    protected initializeLocalHit(command: Command, _context: Context): Awaitable<CommandHit> {
        const now = Date.now();

        return {
            count: 0,
            firstHitTimestamp: now,
            lastHitTimestamp: now,
            config: command.ratelimit ?? this.defaultConfiguration
        };
    }

    protected checkLimited(hit: CommandHit) {
        return hit.count >= hit.config.maxhits && Date.now() - hit.firstHitTimestamp <= hit.config.timeframe;
    }

    public async tryHit(command: Command, context: Context): Promise<boolean> {
        const localHit = await this.getLocalHit(command, context);
        const globalHit = await this.getGlobalHit(command);
        let ret = true;

        if (this.checkLimited(globalHit)) {
            ret = false;
        } else {
            globalHit.lastHitTimestamp = Date.now();
            globalHit.count++;
        }

        if (this.checkLimited(localHit)) {
            ret = false;
        } else {
            localHit.lastHitTimestamp = Date.now();
            localHit.count++;
        }

        return ret;
    }

    public async hit(command: Command, context: Context): Promise<void> {
        if (!(await this.tryHit(command, context))) {
            throw new CommandRateLimitError(command);
        }
    }

    public resetLocalHits(command: Command, context: Context): Awaitable<void> {
        this.localHits.delete(
            `${context.guildId ? (`g::${context.guildId}` as const) : (`c::${context.channelId}` as const)}::${command.name}`
        );
    }

    public async limitedUntil(command: Command, context: Context): Promise<number> {
        const localHit = await this.getLocalHit(command, context);
        const globalHit = await this.getGlobalHit(command);
        let time = 0;

        if (globalHit && this.checkLimited(globalHit)) {
            time = globalHit.firstHitTimestamp + globalHit.config.timeframe;
        }

        if (localHit && this.checkLimited(localHit)) {
            time = Math.max(time, localHit.firstHitTimestamp + localHit.config.timeframe);
        }

        return time;
    }
}

export default TimeBasedCommandRateLimiter;
