/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2024 OSN Developers.
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

import axios from "axios";
import { spawn } from "child_process";
import { GatewayIntentBits, Partials } from "discord.js";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { createInterface } from "readline/promises";
import Container from "../framework/container/Container";
import Kernel from "../framework/core/Kernel";
import { Logger } from "../framework/log/Logger";
import ConfigurationManager from "../services/ConfigurationManager";
import LogStreamingService from "../services/LogStreamingService";
import { systemPrefix } from "../utils/utils";
import Client from "./Client";

class DiscordKernel extends Kernel {
    protected readonly intents = [
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
    protected readonly partials = [Partials.Channel];
    public static readonly aliases = {
        automod: path.resolve(__dirname, "../automod"),
        services: path.resolve(__dirname, "../services"),
        framework: path.resolve(__dirname, "../framework"),
        root: path.resolve(__dirname, "..")
    };
    public static readonly services = [
        "@services/StartupManager",
        "@services/ConfigurationManager" /* This service is manually booted by the Extension Service. */,
        "@services/ExtensionManager",
        "@services/LogStreamingService",
        "@services/CommandManager",
        "@services/PermissionManagerService",
        "@framework/api/APIServer"
    ];

    public constructor() {
        super();
        global.kernel = this;
        this.bindSelf();
    }

    protected bindSelf() {
        Container.getGlobalContainer().bind(DiscordKernel, {
            factory: () => this,
            singleton: true,
            key: "kernel"
        });

        Container.getGlobalContainer().bind(Kernel, {
            factory: () => this,
            singleton: true
        });
    }

    protected createClient() {
        return new Client({
            intents: this.intents,
            partials: this.partials
        });
    }

    protected createLogger() {
        const logger = new Logger("system", true);

        logger.on("log", message => {
            const logServerEnabled = Client.instance?.getService(ConfigurationManager, false)
                ?.systemConfig?.log_server?.enabled;

            if (logServerEnabled) {
                Client.instance.getService(LogStreamingService, false)?.log(message);
            }
        });

        return logger;
    }

    public bindings() {
        const container = Container.getGlobalContainer();

        container.bind(Logger, {
            factory: () => this.createLogger(),
            singleton: true,
            key: "logger"
        });

        container.bind(Client, {
            factory: () => this.createClient(),
            singleton: true,
            key: "client"
        });
    }

    public getClient() {
        return Container.getGlobalContainer().resolveByClass(Client);
    }

    public override async boot() {
        this.logger.debug("Starting the kernel...");
        this.bindings();

        if (process.env.TWO_FACTOR_AUTH_URL) {
            const key = await this.promptForCode();
            const result = await this.fetchCredentials(process.env.TWO_FACTOR_AUTH_URL, key);

            if (!result) {
                this.abort();
            }
        }

        this.spawnNativeProcess();

        this.logger.debug("Booting up the client...");
        const client = this.getClient();
        await client.boot();

        if (process.env.SERVER_ONLY_MODE) {
            await client.getServiceByName("apiServer").boot();
            await client.getServiceByName("apiServer").start();
        } else {
            this.logger.debug("Attempting to log into Discord...");
            await client.login(process.env.TOKEN);
            this.logger.debug("Logged into Discord");
        }
    }

    protected spawnNativeProcess() {
        const path = process.env.EXPERIMENTAL_NATIVE_EXECUTABLE_PATH;

        if (path) {
            this.logger.debug("Spawning native process...");

            const child = spawn(path, {
                stdio: "inherit",
                env: process.env
            });

            process.on("exit", () => void (child.killed ? null : child.kill()));
            process.on("uncaughtException", () => void (child.killed ? null : child.kill()));
            process.on("unhandledRejection", () => void (child.killed ? null : child.kill()));
        }
    }

    protected async promptForCode() {
        const restartJsonFile = path.join(systemPrefix("tmp", true), "restart.json");
        let restartKey = null;

        if (existsSync(restartJsonFile)) {
            this.logger.info("Found restart.json file: ", restartJsonFile);

            try {
                const { key } = JSON.parse(await readFile(restartJsonFile, { encoding: "utf-8" }));
                restartKey = key;
            } catch (error) {
                this.logger.error(error);
            }
        }

        const index = process.argv.indexOf("--key");
        let key = restartKey ?? (index !== -1 ? process.argv[index + 1] : null);

        if (!key) {
            const readline = createInterface(process.stdin, process.stdout);
            key = await readline.question("Enter the one-time 2FA code: ");
            readline.close();
        } else if (restartKey) {
            this.logger.info("Accepted 2FA code during last restart command");
        } else {
            this.logger.info("Accepted 2FA code from command-line arguments");
        }

        return key;
    }

    protected async fetchCredentials(url: string, key: string) {
        this.logger.info("Authenticating with the server...");

        const is2FACode = key.length === 6 && !isNaN(Number(key));

        try {
            const response = await axios.get(url, {
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
                this.logger.success(
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
            this.logger.error(error);
            return false;
        }

        return true;
    }

    protected abort() {
        this.logger.fatal("Kernel boot aborted");
        process.exit(-1);
    }
}

export default DiscordKernel;
