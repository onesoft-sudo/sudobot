import type { TextBasedChannel as DiscordTextBasedChannel } from "discord.js";

export type TextBasedChannel = Extract<DiscordTextBasedChannel, { send: unknown }>;
