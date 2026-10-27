import type Command from "@framework/commands/Command.js";
import type Context from "@framework/commands/Context.js";
import type { Awaitable } from "discord.js";

interface CommandRateLimiter {
    /**
     * Tries to hit the limit counter for a command.
     *
     * @param command Instance of the command being executed.
     * @param context Context of this command execution.
     * @returns {boolean} Whether the hit was successful, i.e. if the rate limit is not exceeded, returns true.
     */
    tryHit(command: Command, context: Context): Awaitable<boolean>;

    /**
     * Hits the limit counter for a command.
     *
     * @param command Instance of the command being executed.
     * @param context Context of this command execution.
     * @throws {CommandRateLimitError} If the rate limit has been exceeded.
     */
    hit(command: Command, context: Context): Awaitable<void>;

    /**
     * Reset the hits for a command.
     *
     * @param command Instance of the command being executed.
     * @param context Context of this command execution.
     */
    resetLocalHits(command: Command, context: Context): Awaitable<void>;

    /**
     * Get the timestamp until which a specific command is disabled
     * due to rate limit exhaustion.
     *
     * @param command Instance of the command being executed.
     * @param context Context of this command execution.
     * @returns {number} Unix timestamp
     */
    limitedUntil(command: Command, context: Context): Awaitable<number>;
}

export default CommandRateLimiter;
