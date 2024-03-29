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
import { existsSync, readFileSync } from "fs";
import { createInterface } from "node:readline/promises";
import path from "path";
import Client from "./core/Client";
import { logError, logInfo, logSuccess } from "./utils/Logger";
import { sudoPrefix } from "./utils/utils";

global.bootDate = Date.now();

if (!Symbol.metadata) {
    (Symbol as unknown as Record<string, symbol>).metadata ??= Symbol("metadata");
}

const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates
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

    const restartJsonFile = path.join(sudoPrefix("tmp", true), "restart.json");
    let restartKey = null;

    if (existsSync(restartJsonFile)) {
        logInfo("Found restart.json file: ", restartJsonFile);

        try {
            const { key } = JSON.parse(readFileSync(restartJsonFile, { encoding: "utf-8" }));
            restartKey = key;
        } catch (error) {
            logError(error);
        }
    }

    const index = process.argv.indexOf("--key");
    let key = restartKey ?? (index !== -1 ? process.argv[index + 1] : null);

    if (!key) {
        const readline = createInterface(process.stdin, process.stdout);
        key = await readline.question("Enter the one-time 2FA code: ");
        readline.close();
    } else if (restartKey) {
        logInfo("Accepted 2FA code during last restart command");
    } else {
        logInfo("Accepted 2FA code from command-line arguments");
    }

    logInfo("Authenticating with the server...");

    const is2FACode = key.length === 6 && !isNaN(Number(key));

    try {
        const response = await axios.get(process.env.CREDENTIAL_SERVER, {
            headers: {
                Authorization: is2FACode ? undefined : `Bearer ${key}`,
                "X-2FA-code": is2FACode ? key : undefined
            }
        });

        if (
            response.data?.success &&
            response.data?.config &&
            typeof response.data?.config === "object"
        ) {
            logSuccess(
                "Successfully authenticated with the credentials server (Method: " +
                    (is2FACode ? "2FA" : "Key") +
                    ")"
            );

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

const promise = (async () => {
    await fetchCredentials();
    const client = new Client({
        intents,
        partials
    });

    spawnNativeProcess();

    await client.boot();

    if (process.env.SERVER_ONLY_MODE) {
        await client.server.boot();
        await client.server.start();
    } else {
        await client.login(process.env.TOKEN);
    }
})();

export default promise;
