import type { Snowflake } from "discord.js";
import { calculateShardId } from "discord.js";

export const isInShards = (
    shards: number[],
    shardCount: number,
    guildId: Snowflake
) => {
    return shards.includes(calculateShardId(guildId, shardCount));
};
