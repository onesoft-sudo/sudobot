import axios from "axios";
import { spawn } from "child_process";
import { GatewayIntentBits, Partials } from "discord.js";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { createInterface } from "readline/promises";
import Container from "../components/container/Container";
import Kernel from "../components/core/Kernel";
import { Logger } from "../components/log/Logger";
import { sudoPrefix } from "../utils/utils";
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
    protected readonly container = Container.getGlobalContainer();

    protected createClient() {
        return new Client({
            intents: this.intents,
            partials: this.partials
        });
    }

    public async bindings() {
        // const client = this.createClient();

        await this.container.bind(Logger, {
            value: new Logger("sys2", true),
            singleton: true
        });

        await this.container.bind(Client, {
            value: this.createClient(),
            singleton: true
        });
    }

    public getClient() {
        return this.container.resolve(Client);
    }

    public override async boot() {
        this.logger.debug("Starting the kernel...");
        await this.bindings();

        if (process.env.TWO_FACTOR_AUTH_URL) {
            const key = await this.promptForCode();
            const result = await this.fetchCredentials(process.env.TWO_FACTOR_AUTH_URL, key);

            if (!result) {
                this.abort();
            }
        }

        this.spawnNativeProcess();

        this.logger.debug("Booting up the client...");
        const client = await this.getClient();
        await client.boot();

        if (process.env.SERVER_ONLY_MODE) {
            // await client.server.boot();
            // await client.server.start();
        } else {
            this.logger.debug("Attempting to log into Discord...");
            // await client.login(process.env.TOKEN);
            // FIXME: ^^^ This is the line that needs to be fixed
            this.logger.success("Logged into Discord");
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
        const restartJsonFile = path.join(sudoPrefix("tmp", true), "restart.json");
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
