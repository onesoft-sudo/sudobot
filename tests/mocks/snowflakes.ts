import { Snowflake } from "discord.js";

export function randomSnowflake(): Snowflake {
    let snowflake = "";

    for (let i = 0; i < 18; i++) {
        snowflake += Math.floor(Math.random() * 10);
    }

    return snowflake;
}
