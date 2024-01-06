namespace NodeJS {
    interface ProcessEnv {
        TOKEN: string;
        CLIENT_ID: string;
        HOME_GUILD_ID: string;
        SUDO_ENV: string;
        NODE_ENV: string;
        DEBUG: string;
        API_NINJAS_JOKE_API_KEY: string;
        EXPERIMENTAL_NATIVE_EXECUTABLE_PATH: string;
        CAT_API_TOKEN: string;
        DOG_API_TOKEN: string;
        CLIENT_SECRET: string;
        BASE_SERVER_URL: string;
        DISCORD_OAUTH2_REDIRECT_URI: string;
        DISCORD_OAUTH2_RP_REDIRECT_URI: string;
        FRONTEND_URL: string;
        PIXABAY_TOKEN: string;
        RECAPTCHA_TOKEN: string;
        ERROR_WEKHOOK_URL: string;
        ERROR_WEKHOOK_URL: string;
        BACKUP_CHANNEL_ID: string;
        ENV: string;
        MONGO_URI: string;
        JWT_SECRET: string;
        AUTOBACKUP_CHANNEL: string;
        PERSPECTIVE_API_TOKEN: string;
        GOOGLE_API_KEY: string;
        VIRUSTOTAL_API_KEY: string;
        DB_URL: string;
        SUDO_PREFIX: string;
        SERVER_ONLY_MODE: string;
        COMMANDS: string;
        JWT_SECRET: string;
        CF_AI_URL: string;
        LOG_SERVER_PASSWORD: string;
        OSN_EMOJIKITCHEN_API: string;
        GOOGLE_MAKERSUIT_KEY: string;
        RECAPTCHA_SITE_SECRET: string;
        FRONTEND_AUTH_KEY: string;
    }
}

declare var global: {
    bootDate: number;
};
