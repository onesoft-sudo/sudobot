/**
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
import "module-alias/register";
import "reflect-metadata";

import axios from "axios";
import { spawn } from "child_process";
import { GatewayIntentBits, Partials } from "discord.js";
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import Client from "./core/Client";
import { logError, logInfo, logSuccess } from "./utils/logger";

global.bootDate = Date.now();

const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildInvites
];

const partials = [Partials.Channel];

function spawnNativeProcess() {
    const path = process.env.EXPERIMENTAL_NATIVE_EXECUTABLE_PATH;

    if (path) {
        const child = spawn(path, {
            stdio: "inherit",
            env: process.env
        });

        process.on("exit", () => void (child.killed ? null : child.kill()));
        process.on("uncaughtException", () => void (child.killed ? null : child.kill()));
        process.on("unhandledRejection", () => void (child.killed ? null : child.kill()));
    }
}

async function fetchCredentials() {
    if (!process.env.CREDENTIAL_SERVER) {
        return;
    }

    const index = process.argv.indexOf("--key");
    let key = index !== -1 ? process.argv[index + 1] : null;

    if (!key) {
        const readline = createInterface(process.stdin, process.stdout);
        key = await readline.question("Enter key to authenticate with the credentials server: ");
        readline.close();
    } else {
        logInfo("Accepted key from command-line arguments");
    }

    logInfo("Authenticating with the server...");

    try {
        const response = await axios.get(process.env.CREDENTIAL_SERVER, {
            headers: {
                Authorization: `Bearer ${key}`
            }
        });

        if (response.data?.success && response.data?.config && typeof response.data?.config === "object") {
            logSuccess("Successfully authenticated with the credentials server");

            for (const key in response.data.config) {
                process.env[key] = response.data.config[key];
            }
        } else {
            throw new Error("Invalid response received");
        }
    } catch (error) {
        logError(error);
        process.exit(-1);
    }
}

(async () => {
    await fetchCredentials();
    const client = new Client({
        intents,
        partials
        // makeCache: Options.cacheWithLimits({
        //     ...Options.DefaultMakeCacheSettings,
        //     ReactionManager: 0,
        //     DMMessageManager: 0,
        //     GuildForumThreadManager: 0,
        //     GuildScheduledEventManager: 0,
        //     VoiceStateManager: 0,
        //     StageInstanceManager: 0,
        //     GuildTextThreadManager: 0,
        //     GuildStickerManager: 0,
        //     AutoModerationRuleManager: 0,
        //     ApplicationCommandManager: 0,
        //     ThreadMemberManager: 0,
        //     ThreadManager: 0,
        //     ReactionUserManager: 0,
        //     GuildMemberManager: 25,
        //     GuildBanManager: 0,
        //     GuildEmojiManager: 25,
        //     GuildInviteManager: 5,
        //     GuildMessageManager: 50,
        //     BaseGuildEmojiManager: 5
        // }),
        // sweepers: {
        //     ...Options.DefaultSweeperSettings,
        //     messages: {
        //         interval: 1200, // Every 20 minutes.
        //         lifetime: 600 // Remove messages older than 10 minutes.
        //     },
        //     users: {
        //         interval: 1200,
        //         filter: () => user => user.bot && user.id !== user.client.user.id // Remove all bots.
        //     },
        //     guildMembers: {
        //         interval: 1200,
        //         filter: () => member => member.user.bot && member.id !== member.client.user.id // Remove all bots.
        //     }
        // }
    });

    spawnNativeProcess();

    await client.boot();
    await client.loadEvents();
    await client.loadCommands();

    if (process.env.SERVER_ONLY_MODE) {
        await client.server.boot();
        await client.server.start();
    } else {
        await client.login(process.env.TOKEN);
    }
})();
