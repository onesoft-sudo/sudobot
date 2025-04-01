/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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

import type { AnyConstructor } from "@framework/container/Container";
import Container from "@framework/container/Container";
import Kernel from "@framework/core/Kernel";
import { Logger } from "@framework/log/Logger";
import { setEnvData } from "@main/env/env";
import { createAxiosClient } from "@main/utils/axios";
import metadata from "@root/package.json";
import axios from "axios";
import { spawn } from "child_process";
import crypto from "crypto";
import { GatewayIntentBits, Partials } from "discord.js";
import { parse } from "dotenv";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { MlKem768 } from "mlkem";
import path from "path";
import { createInterface } from "readline/promises";
import { systemPrefix } from "../utils/utils";
import Client from "./Client";

type Binding = {
    key: string;
    value: object;
};

export type MetadataType = typeof metadata;

class DiscordKernel extends Kernel {
    protected readonly intents = (process.env.DISCORD_INTENTS?.split(":")?.map(intent => {
        if (!(intent in GatewayIntentBits)) {
            throw new Error(`Invalid intent in DISCORD_INTENTS: ${intent}`);
        }

        return GatewayIntentBits[intent as keyof typeof GatewayIntentBits];
    }) as GatewayIntentBits[] | undefined) || [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildExpressions,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages
    ];
    protected readonly partials = [Partials.Channel];
    public static readonly aliases = {
        automod: path.resolve(__dirname, "../automod"),
        services: path.resolve(__dirname, "../services"),
        root: path.resolve(__dirname, "../../..")
    };
    public static readonly services = [
        "@services/StartupManager",
        "@services/DatabaseService",
        "@services/ConfigurationManager" /* This service is manually booted by the Extension Service. */,
        "@services/ExtensionManager",
        "@services/LogStreamingService",
        "@services/CommandManager",
        "@services/PermissionManagerService",
        "@services/ExtensionPostBootManager",
        "@services/QueueService",
        "@services/AuditLoggingService",
        "@services/SystemAuditLoggingService",
        "@services/InfractionManager",
        "@services/ImageRecognitionService",
        "@services/InviteTrackingService",
        "@automod/AntiMemberJoinService",
        "@services/ModerationActionService",
        "@automod/SpamModerationService",
        "@automod/RuleModerationService",
        "@automod/RaidProtectionService",
        "@services/DirectiveParsingService",
        "@automod/VerificationService",
        "@automod/AIAutoModeration",
        "@services/QuickMuteService",
        "@services/ChannelLockManager",
        "@services/ReactionRoleService",
        "@services/AFKService",
        "@services/AutoRoleService",
        "@automod/TriggerService",
        "@services/MessageReportingService",
        "@services/WelcomerService",
        "@services/BumpReminderService",
        "@services/SurveyService",
        "@services/ShellService",
        "@services/AuthService",
        "@services/WizardManagerService",
        "@services/GuildSetupService",
        "@services/SnippetManagerService",
        "@services/TranslationService",
        "@services/InterProcessCommunicationService",
        "@services/SystemUpdateService",
        "@root/framework/typescript/api/APIServer"
    ];

    private readonly encryptedEnvFilePath = path.join(
        __dirname,
        __filename.endsWith(".js") ? ".." : "",
        "../../../../.env.encrypted"
    );

    public constructor() {
        super();
        global.kernel = this;
        this.bindSelf();
    }

    protected bindings(): Binding[] {
        const application = this.getApplication();

        return [
            { key: "application", value: application },
            { key: "client", value: application.getClient() },
            { key: "logger", value: application.logger },
            { key: "serviceManager", value: application.serviceManager },
            { key: "dynamicLoader", value: application.classLoader }
        ];
    }

    protected bindSelf() {
        Container.getInstance().bind(DiscordKernel, {
            factory: () => this,
            singleton: true,
            key: "kernel"
        });

        Container.getInstance().bind(Kernel, {
            factory: () => this,
            singleton: true
        });
    }

    protected createClient(logger: Logger) {
        return new Client(
            {
                intents: this.intents,
                partials: this.partials
            },
            logger
        );
    }

    protected createLogger() {
        const logger = new Logger("system", true);

        logger.on("log", message => {
            const logServerEnabled = this.getApplication()?.service("configManager", false)
                ?.systemConfig?.log_server?.enabled;

            if (logServerEnabled) {
                this.getApplication().service("logStreamingService", false)?.log(message);
            }
        });

        return logger;
    }

    public setup() {
        const application = this.getApplication();

        const logger = this.createLogger();
        const client = this.createClient(logger);

        application.setLogger(logger);
        application.setClient(client);
        application.setMetadata(metadata);

        this.bindSelf();

        for (const binding of this.bindings()) {
            application.container.bind(binding.value.constructor as AnyConstructor, {
                factory: () => binding.value,
                singleton: true,
                key: binding.key
            });
        }

        createAxiosClient(application);
    }

    public getClient() {
        return Container.getInstance().resolveByClass(Client);
    }

    public override async boot() {
        this.logger.debug("Starting the kernel...");
        this.setup();

        if (process.env.TWO_FACTOR_AUTH_URL) {
            const key = await this.promptForCode();
            const result = await this.fetchCredentials(process.env.TWO_FACTOR_AUTH_URL, key);

            if (!result) {
                this.abort();
            }
        } else if (existsSync(this.encryptedEnvFilePath)) {
            this.logger.warn(
                "Encrypted environment file found, but no 2FA URL provided. Ignoring..."
            );
        }

        this.spawnNativeProcess();

        this.logger.debug("Booting up the application...");

        const application = this.getApplication();
        await application.boot();

        if (process.env.SERVER_ONLY_MODE) {
            await application.service("apiServer").boot();
            application.service("apiServer").start();
        } else {
            this.logger.debug("Attempting to log into Discord...");
            await application.getClient().login(process.env.TOKEN);
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
            const readline = createInterface(
                process.stdin as unknown as NodeJS.ReadableStream,
                process.stdout as unknown as NodeJS.WritableStream
            );
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
        if (!url.startsWith("https://") && !url.startsWith("http://localhost:")) {
            this.logger.error("Two-factor authentication URL must be secure HTTPS");
            return false;
        }

        if (!existsSync(this.encryptedEnvFilePath)) {
            this.logger.error("No encrypted environment secret file found");
            return;
        }

        this.logger.info("Authenticating with the 2FA server...");

        const is2FACode = key.length === 6 && !isNaN(Number(key));

        try {
            const response = await axios.post(
                url,
                {
                    code: is2FACode ? key : undefined
                },
                {
                    headers: {
                        Authorization: is2FACode ? undefined : `Bearer ${key}`
                    }
                }
            );

            if (response.data?.privateKey && typeof response.data?.privateKey === "string") {
                this.logger.success(
                    "Successfully authenticated with the credentials server (Method: " +
                        (is2FACode ? "2FA" : "Key") +
                        ")"
                );

                /* The response contains all data in hex format.
                   Therefore first decode it to a buffer. */
                const privateKey = new Uint8Array(Buffer.from(response.data.privateKey, "hex"));

                /* The encrypted data is in the following format:
                   - First 4 bytes: The size of the IV (ivSize)
                   - Next 4 bytes: The size of the auth tag (authTagSize)
                   - Next 4 bytes: The size of the cipher text (cipherTextSize)
                   - Next (ivSize) bytes: The IV used for encryption
                   - Next (authTagSize) bytes: The auth tag
                   - Next (cipherTextSize) bytes: The encrypted data
                   - Remaining bytes: Encrypted data */
                const encryptedData = Buffer.from(
                    await readFile(this.encryptedEnvFilePath, "binary"),
                    "binary"
                );

                if (encryptedData.length < 16 || encryptedData.readUInt32BE(0) !== 0x7c83) {
                    throw new Error("Invalid encrypted data received");
                }

                const ivSize = encryptedData.readUInt32BE(4);
                const authTagSize = encryptedData.readUInt32BE(8);
                const cipherTextSize = encryptedData.readUInt32BE(12);
                const iv = Uint8Array.prototype.slice.call(encryptedData, 16, 16 + ivSize);
                const authTag = Uint8Array.prototype.slice.call(
                    encryptedData,
                    16 + ivSize,
                    16 + ivSize + authTagSize
                );
                const cipherText = Uint8Array.prototype.slice.call(
                    encryptedData,
                    16 + ivSize + authTagSize,
                    16 + ivSize + authTagSize + cipherTextSize
                );
                const encryptedEnv = Uint8Array.prototype.slice.call(
                    encryptedData,
                    16 + ivSize + authTagSize + cipherTextSize
                );

                const mlkem = new MlKem768();
                const decryptedSharedSecret = await mlkem.decap(cipherText, privateKey);
                const decipher = crypto.createDecipheriv("aes-256-gcm", decryptedSharedSecret, iv);
                decipher.setAuthTag(authTag);
                const decryptedTextData =
                    decipher.update(encryptedEnv, undefined, "utf8") + decipher.final("utf8");

                this.logger.success("Successfully decrypted the environment data");

                try {
                    const data = parse(decryptedTextData);

                    setEnvData({
                        ...process.env,
                        ...data
                    } as unknown as Record<string, string | undefined>);

                    for (const key in data) {
                        process.env[key] = data[key];
                    }

                    this.logger.success("Successfully loaded environment data");
                } catch (error) {
                    this.logger.error(
                        "Failed to parse decrypted data: " +
                            (error instanceof Error ? error.message : `${error}`)
                    );
                    return false;
                }
            } else {
                throw new Error("Invalid response received");
            }
        } catch (error) {
            this.logger.error(`${error instanceof Error ? error.message : `${error}`}`);
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
