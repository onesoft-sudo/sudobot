namespace NodeJS {
    interface ProcessEnv {
        TOKEN: string;
        CLIENT_ID: string;
        HOME_GUILD_ID: string;
        DB_URL: string;
        JWT_SECRET: string;
        ENV?: "dev" | "prod";
        SUDO_ENV?: "dev" | "prod";
        NODE_ENV?: "dev" | "prod" | "development" | "production";
        DEBUG?: "1" | "0";
        CLIENT_SECRET: string;
        BASE_SERVER_URL: string;
        DISCORD_OAUTH2_REDIRECT_URI: string;
        DISCORD_OAUTH2_RP_REDIRECT_URI: string;
        FRONTEND_URL: string;
        SUDO_PREFIX?: string;
        ERROR_WEKHOOK_URL?: string;
        BACKUP_CHANNEL_ID?: string;
        JWT_ISSUER: string;
        JWT_SECRET: string;
        FRONTEND_AUTH_KEY: string;
        CREDENTIAL_SERVER?: string;
        PRIVATE_BOT_MODE?: string;
    }
}

declare var global: {
    bootDate: number;
};
