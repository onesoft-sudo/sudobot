import type Command from "@framework/commands/Command.js";
import type { CommandRateLimitConfiguration } from "@framework/security/CommandRateLimitConfiguration.js";
import type CommandRateLimiter from "@framework/security/CommandRateLimiter.js";
import CommandRateLimitError from "@framework/security/CommandRateLimitError.js";
import { Collection } from "discord.js";

type CommandHit = {
    count: number;
    firstHitTimestamp: number;
    lastHitTimestamp: number;
    config: Readonly<CommandRateLimitConfiguration>;
};

class BasicCommandRateLimiter implements CommandRateLimiter {
    private readonly hits = new Collection<string, CommandHit>();
    private readonly defaultConfiguration: Readonly<CommandRateLimitConfiguration>;

    public constructor(defaultConfiguration: CommandRateLimitConfiguration) {
        this.defaultConfiguration = defaultConfiguration;

        setInterval(() => {
            this.hits.sweep(hit => {
                if (Date.now() - hit.lastHitTimestamp > hit.config.timeframe) {
                    return true;
                }

                return false;
            });
        }, 60_000);
    }

    private getHit(command: Command) {
        let hit = this.hits.get(command.name);

        if (hit) {
            return hit;
        }

        const now = Date.now();

        hit = {
            count: 0,
            firstHitTimestamp: now,
            lastHitTimestamp: now,
            config: command.ratelimit ?? this.defaultConfiguration
        };

        this.hits.set(command.name, hit);
        return hit;
    }

    private checkLimited(hit: CommandHit) {
        return hit.count >= hit.config.maxhits && Date.now() - hit.lastHitTimestamp <= hit.config.timeframe;
    }

    public tryHit(command: Command): boolean {
        const hit = this.getHit(command);

        if (this.checkLimited(hit)) {
            return false;
        }

        hit.lastHitTimestamp = Date.now();
        hit.count++;
        return true;
    }

    public hit(command: Command): void {
        if (!this.tryHit(command)) {
            throw new CommandRateLimitError(command);
        }
    }

    public resetHits(command: Command): void {
        this.hits.delete(command.name);
    }

    public limitedUntil(command: Command): number {
        const hit = this.getHit(command);

        if (!hit) {
            return 0;
        }

        if (!this.checkLimited(hit)) {
            return 0;
        }

        return hit.lastHitTimestamp + hit.config.timeframe;
    }
}

export default BasicCommandRateLimiter;
