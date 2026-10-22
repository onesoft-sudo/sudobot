import type Command from "@framework/commands/Command.js";

interface CommandRateLimiter {
    /**
     * Tries to hit the limit counter for a command.
     *
     * @param command Instance of the command being executed.
     * @returns {boolean} Whether the hit was successful, i.e. if the rate limit is not exceeded, returns true.
     */
    tryHit(command: Command): boolean;

    /**
     * Hits the limit counter for a command.
     *
     * @param command Instance of the command being executed.
     * @throws {CommandRateLimitError} If the rate limit has been exceeded.
     */
    hit(command: Command): void;

    /**
     * Reset the hits for a command.
     *
     * @param command Instance of the command being executed.
     */
    resetHits(command: Command): void;

    /**
     * Get the timestamp until which a specific command is disabled
     * due to rate limit exhaustion.
     *
     * @param command Instance of the command being executed.
     * @returns {number} Unix timestamp
     */
    limitedUntil(command: Command): number;
}

export default CommandRateLimiter;
