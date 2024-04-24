import type { DiscordAPIError } from "discord.js";

export function isDiscordAPIError(error: unknown): error is DiscordAPIError {
    return (
        typeof error === "object" &&
        !!error &&
        "name" in error &&
        "code" in error &&
        typeof error.name === "string" &&
        error.name.startsWith("DiscordAPIError")
    );
}
