/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
 *
 * SudoBot is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SudoBot is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
 */

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
        GEMINI_API_KEY?: string;
        OPENAI_API_KEY?: string;
        OPENAI_MODEL_ID?: string;
        EXTENSIONS_DIRECTORY?: string;
        OPENAI_MODERATION?: string;
        NO_GENERATE_CONFIG_SCHEMA?: string;
        NSFWJS_MODEL_URL?: string;
        NSFWJS_MODEL_IMAGE_SIZE?: string;
        BACKUP_STORAGE?: string;
    }
}
