import type { Snowflake } from "../utils/Snowflake";

export type User = {
    id: number;
    name?: string;
    discordId: Snowflake;
    username: string;
    avatar: string | null;
    avatarURL: string;
};
