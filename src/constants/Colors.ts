import { Colors as DiscordColors } from "discord.js";

export const Colors = {
    ...DiscordColors,
    Primary: 0x007bff,
    Danger: DiscordColors.Red,
    Success: DiscordColors.Green
} as const;
