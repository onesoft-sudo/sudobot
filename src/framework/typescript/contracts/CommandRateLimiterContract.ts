import { Snowflake } from "discord.js";

interface CommandRateLimiterContract {
    isRateLimitedWithHit(
        commandName: string,
        guildId: Snowflake,
        userId: Snowflake
    ): Promise<boolean>;
}

export default CommandRateLimiterContract;
