import { DiscordAPIErrorMessage } from "@framework/errors/DiscordAPIErrorMessage";

class APIErrors {
    public static translateToMessage(code: number, overrides?: Record<number, string>) {
        return (
            overrides?.[code] ??
            DiscordAPIErrorMessage[code as keyof typeof DiscordAPIErrorMessage] ??
            "An unknown error has occurred"
        );
    }
}

export default APIErrors;
