import { z } from "zod";

export const EnvironmentVariableSchema = z.object({
    TOKEN: z.string(),
    CLIENT_ID: z.string(),
    CLIENT_SECRET: z.string(),
    DB_URL: z.string(),
    JWT_SECRET: z.string(),
    JWT_ISSUER: z.string().default("SudoBot"),
    HOME_GUILD_ID: z.string(),
    SUDO_ENV: z.enum(["dev", "prod"]).optional(),
    NODE_ENV: z.enum(["dev", "prod", "development", "production", "test"]).default("production"),
    DEBUG: z.enum(["1", "0"]).optional(),
    BASE_SERVER_URL: z.string().optional(),
    DISCORD_OAUTH2_REDIRECT_URI: z.string().optional(),
    DISCORD_OAUTH2_RP_REDIRECT_URI: z.string().optional(),
    FRONTEND_URL: z.string().optional(),
    SUDO_PREFIX: z.string().optional(),
    ERROR_WEBHOOK_URL: z.string().optional(),
    BACKUP_CHANNEL_ID: z.string().optional(),
    FRONTEND_AUTH_KEY: z.string().optional(),
    CREDENTIAL_SERVER: z.string().optional(),
    PRIVATE_BOT_MODE: z.literal("true").optional(),
    EXTENSIONS_DIRECTORY: z.string().optional(),
    NO_GENERATE_CONFIG_SCHEMA: z.string().optional(),
    NSFWJS_MODEL_URL: z.string().optional(),
    NSFWJS_MODEL_IMAGE_SIZE: z.string().optional(),
    BACKUP_STORAGE: z.string().optional(),
    SUPPRESS_LOGS: z.string().optional(),
    CAT_API_TOKEN: z.string().optional(),
    DOG_API_TOKEN: z.string().optional(),
    HTTP_USER_AGENT: z
        .string()
        .optional()
        .nullable()
        .transform(value => (value === "null" ? null : value))
});

export type EnvironmentVariableRecord = z.infer<typeof EnvironmentVariableSchema>;
