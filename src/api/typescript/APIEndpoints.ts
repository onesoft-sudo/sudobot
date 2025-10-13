import type { Snowflake } from "./utils/Snowflake";

export const APIEndpoints = {
    Login: "/login",
    LoginWithDiscord: "/challenge/auth/discord",
    GuildConfiguration: (guildId: Snowflake) => `/guilds/${encodeURI(guildId)}/config`
} as const;
