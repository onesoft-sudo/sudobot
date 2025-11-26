/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025 OSN Developers.
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

import "./preload";

import { Logger } from "@framework/log/Logger";
import { setEnvData } from "@main/env/env";
import { systemPrefix } from "@main/utils/utils";
import axios from "axios";
import { fork } from "child_process";
import * as crypto from "crypto";
import type { DotenvParseOutput } from "dotenv";
import { parse } from "dotenv";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { MlKem768 } from "mlkem";
import { createInterface } from "readline/promises";
import chalk from "chalk";
import path from "path";
import figlet from "figlet";
import { version } from "@root/package.json";

const logger = new Logger("PM", true);
const encryptedEnvFilePath = path.join(__dirname, __filename.endsWith(".js") ? ".." : "", "../../../.env.encrypted");

async function fetchCredentials(url: string, key: string) {
    if (!url.startsWith("https://") && !url.startsWith("http://localhost:")) {
        logger.error("Two-factor authentication URL must be secure HTTPS");
        return null;
    }

    if (!existsSync(encryptedEnvFilePath)) {
        logger.error("No encrypted environment secret file found");
        return null;
    }

    logger.info("Authenticating with the 2FA server...");
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
            logger.success(
                "Successfully authenticated with the credentials server (Method: " + (is2FACode ? "2FA" : "Key") + ")"
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
            const encryptedData = Buffer.from(await readFile(encryptedEnvFilePath, "binary"), "binary");

            if (encryptedData.length < 16 || encryptedData.readUInt32BE(0) !== 0x7c83) {
                throw new Error("Invalid encrypted data received");
            }

            const ivSize = encryptedData.readUInt32BE(4);
            const authTagSize = encryptedData.readUInt32BE(8);
            const cipherTextSize = encryptedData.readUInt32BE(12);
            const iv = Uint8Array.prototype.slice.call(encryptedData, 16, 16 + ivSize);
            const authTag = Uint8Array.prototype.slice.call(encryptedData, 16 + ivSize, 16 + ivSize + authTagSize);
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
            const decryptedTextData = decipher.update(encryptedEnv, undefined, "utf8") + decipher.final("utf8");

            logger.success("Successfully decrypted the environment data");

            try {
                const data = parse(decryptedTextData);

                setEnvData({
                    ...process.env,
                    ...data
                } as unknown as Record<string, string | undefined>);

                for (const key in data) {
                    process.env[key] = data[key];
                }

                return data;
            }
            catch (error) {
                logger.error(
                    "Failed to parse decrypted data: " + (error instanceof Error ? error.message : `${error}`)
                );
                return null;
            }
        }
        else {
            throw new Error("Invalid response received");
        }
    }
    catch (error) {
        logger.error(`${error instanceof Error ? error.message : `${error}`}`);
        return null;
    }
}

async function promptForCode() {
    const restartJsonFile = path.join(systemPrefix("tmp", true), "restart.json");
    let restartKey = null;

    if (existsSync(restartJsonFile)) {
        logger.info("Found restart.json file: ", restartJsonFile);

        try {
            const { key } = JSON.parse(await readFile(restartJsonFile, { encoding: "utf-8" }));
            restartKey = key;
        } catch (error) {
            logger.error(error);
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
    }
    else if (restartKey) {
        logger.info("Accepted 2FA code during last restart command");
    }
    else {
        logger.info("Accepted 2FA code from command-line arguments");
    }

    return key;
}

function createChild(data: DotenvParseOutput | null, signal?: AbortSignal, argv: string[] = []) {
    return new Promise<void>(resolve => {
        const child = fork(
            path.resolve(__dirname, "main" + (__filename.endsWith(".ts") ? ".ts" : ".js")),
            [...argv, ...process.argv.slice(2)],
            {
                stdio: "inherit",
                env: {
                    ...process.env,
                    SUDOBOT_WRAPPER: "1"
                }
            }
        );

        const onCloseHandler = () => {
            if (child.exitCode === null) {
                if (!child.kill("SIGTERM")) {
                    child.kill("SIGKILL");
                }
            }

            resolve();
        };

        child.on("close", onCloseHandler);
        child.on("error", err => {
            logger.error("An error occurred");
            console.error(err);
            onCloseHandler();
        });

        child.on("disconnect", onCloseHandler);
        child.on("exit", () => resolve());

        child.on("message", message => {
            const messageData =
                message && typeof message === "object"
                    ? (message as {
                          type: string;
                          data?: unknown;
                      })
                    : null;

            if (messageData?.type === "SECRETS_ACK") {
                logger.info(`${child.pid}: Child process acknowledged secret data`);
                return;
            }

            if (messageData?.type === "READY") {
                logger.info(`${child.pid}: Child process is ready`);

                child.send({
                    type: "SECRETS",
                    data
                });

                logger.info(`${child.pid}: Sent secret data to child process`);
                return;
            }

            logger.warn(`${child.pid}: Invalid IPC message received`);
        });

        signal?.addEventListener("abort", () => {
            if (!child.kill("SIGTERM")) {
                child.kill("SIGKILL");
            }

            child.removeAllListeners("close");
            resolve();
        });
    });
}

async function createShard(
    data: DotenvParseOutput | null,
    shardId: number,
    shardCount: number,
    signal?: AbortSignal,
    argv: string[] = []
) {
    let restarts = 0;
    let lastRestart: number = 0;

    logger.info(`Starting shard ${shardId}`);

    for (;;) {
        await createChild(data, signal, [
            ...argv,
            "--shard",
            shardId.toString(),
            "--shardcount",
            shardCount.toString()
        ]);

        if (Date.now() - lastRestart <= 30000 && restarts >= 10) {
            logger.error(`Shard ${shardId}: 10 restarts in 30 seconds -- aborting now`);
            return false;
        }

        logger.info(`Shard ${shardId} exited, starting again in 5 seconds`);
        await new Promise<void>(resolve => setTimeout(resolve, 5000));
        lastRestart = Date.now();
        restarts++;
    }
}

async function main() {
    let result: DotenvParseOutput | null = null;

    if (process.env.TWO_FACTOR_AUTH_URL) {
        const key = await promptForCode();
        result = await fetchCredentials(process.env.TWO_FACTOR_AUTH_URL, key);

        if (!result) {
            logger.fatal("Kernel boot aborted");
            process.exit(-1);
        }
    }
    else if (existsSync(encryptedEnvFilePath)) {
        logger.warn("Encrypted environment file found, but no 2FA URL provided. Ignoring...");
    }

    if (process.env.SUDOBOT_SHARD_COUNT && +process.env.SUDOBOT_SHARD_COUNT) {
        console.info();
        console.info(chalk.blueBright((await figlet.text("SudoBot")).replace(/\s+$/, "")));
        console.info();
        console.info(`      Version ${chalk.green(version)} -- booting up`);
        console.info();
    }

    logger.info("Starting main process");

    let restarts = 0;
    let lastRestart: number = 0;

    for (;;) {
        if (process.env.SUDOBOT_SHARD_COUNT && +process.env.SUDOBOT_SHARD_COUNT) {
            const promises = [];
            const count = +process.env.SUDOBOT_SHARD_COUNT;
            const abortController = new AbortController();

            for (let i = 0; i < count; i++) {
                const promise = createShard(result, i, count, abortController.signal);
                promises.push(
                    promise.then(result => {
                        if (!result) {
                            abortController.abort();
                            logger.error("One or more shard(s) errored");
                            setTimeout(() => process.exit(-1), 5000);
                        }
                    })
                );
            }

            await Promise.all(promises);
        }
        else {
            await createChild(result);
        }

        if (Date.now() - lastRestart <= 30000 && restarts >= 10) {
            logger.error("10 restarts in 30 seconds -- aborting now");
            process.exit(-1);
        }

        logger.info("Main process exited, starting again in 5 seconds");
        await new Promise<void>(resolve => setTimeout(resolve, 5000));
        lastRestart = Date.now();
        restarts++;
    }
}

main().then().catch(console.error);
