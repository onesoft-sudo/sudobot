import { Logger } from "@framework/log/Logger.js";
import TwoFactorAuthenticator from "@framework/security/TwoFactorAuthenticator.js";
import BannerPrinter from "@main/sharding/BannerPrinter.js";
import { IPCMessageType } from "@main/sharding/IPCMessageType.js";
import { systemPrefix } from "@main/utils/utils.js";
import { fork } from "child_process";
import type { DotenvParseOutput } from "dotenv";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "node:path";
import { createInterface } from "readline/promises";

class MasterProcessManager {
    private readonly logger = Logger.getLogger(MasterProcessManager);
    private readonly encryptedEnvFilePath = path.join(
        import.meta.dirname,
        import.meta.filename.endsWith(".js") ? ".." : "",
        "../../../.env.encrypted"
    );
    private readonly argv: string[];

    public constructor(argv: string[]) {
        this.argv = argv;
    }

    private async promptForCode() {
        const restartJsonFile = path.join(systemPrefix("tmp"), "restart.json");
        let restartKey = null;

        if (existsSync(restartJsonFile)) {
            this.logger.info("Found restart.json file: ", restartJsonFile);

            try {
                const { key } = JSON.parse(
                    await readFile(restartJsonFile, { encoding: "utf-8" })
                );
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

    private async authenticate(url: string, key: string) {
        if (
            !url.startsWith("https://") &&
            !url.startsWith("http://localhost:")
        ) {
            this.logger.error(
                "Two-factor authentication URL must be secure HTTPS"
            );
            return null;
        }

        if (!existsSync(this.encryptedEnvFilePath)) {
            this.logger.error("No encrypted environment secret file found");
            return null;
        }

        const twoFactorAuthenticator = new TwoFactorAuthenticator();

        try {
            return await twoFactorAuthenticator.fetchCredentials(
                Buffer.from(
                    await readFile(this.encryptedEnvFilePath, "binary"),
                    "binary"
                ),
                url,
                key
            );
        } catch (error) {
            this.logger.error(
                `${error instanceof Error ? error.message : `${error}`}`
            );
            return null;
        }
    }

    private createChild(
        data: DotenvParseOutput | null,
        signal?: AbortSignal,
        argv: string[] = []
    ) {
        return new Promise<void>(resolve => {
            const child = fork(
                path.resolve(this.argv[1]),
                [
                    ...argv,
                    ...process.argv
                        .slice(2)
                        .filter(arg => arg != "-M" && arg != "--master")
                ],
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
                this.logger.error("An error occurred");
                console.error(err);
                onCloseHandler();
            });

            child.on("disconnect", onCloseHandler);
            child.on("exit", () => resolve());

            child.on("message", message => {
                const messageData =
                    message && typeof message === "object"
                        ? (message as {
                              type: IPCMessageType;
                              data?: unknown;
                          })
                        : null;

                if (messageData?.type === IPCMessageType.SECRETS_ACK) {
                    this.logger.info(
                        `${child.pid}: Child process acknowledged secret data`
                    );
                    return;
                }

                if (messageData?.type === IPCMessageType.READY) {
                    this.logger.info(`${child.pid}: Child process is ready`);

                    child.send({
                        type: IPCMessageType.SECRETS,
                        data
                    });

                    this.logger.info(
                        `${child.pid}: Sent secret data to child process`
                    );
                    return;
                }

                this.logger.warn(`${child.pid}: Invalid IPC message received`);
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

    private async createShard(
        data: DotenvParseOutput | null,
        shardId: number,
        shardCount: number,
        signal?: AbortSignal,
        argv: string[] = []
    ) {
        let restarts = 0;
        let lastRestart: number = 0;

        this.logger.info(`Starting shard ${shardId}`);

        for (;;) {
            await this.createChild(data, signal, [
                ...argv,
                "--shard",
                shardId.toString(),
                "--shardcount",
                shardCount.toString()
            ]);

            if (Date.now() - lastRestart <= 30000 && restarts >= 10) {
                this.logger.error(
                    `Shard ${shardId}: 10 restarts in 30 seconds -- aborting now`
                );

                return false;
            }

            this.logger.info(
                `Shard ${shardId} exited, starting again in 5 seconds`
            );
            await new Promise<void>(resolve => setTimeout(resolve, 5000));
            lastRestart = Date.now();
            restarts++;
        }
    }

    public async start(
        shardCount = process.env.SUDOBOT_SHARD_COUNT &&
        +process.env.SUDOBOT_SHARD_COUNT
            ? +process.env.SUDOBOT_SHARD_COUNT
            : 0
    ) {
        if (shardCount <= 0) {
            shardCount = 1;
        }

        let result: DotenvParseOutput | null = null;

        if (process.env.TWO_FACTOR_AUTH_URL) {
            const key = await this.promptForCode();
            result = await this.authenticate(
                process.env.TWO_FACTOR_AUTH_URL,
                key
            );

            if (!result) {
                this.logger.fatal("Kernel boot aborted");
                process.exit(-1);
            }
        } else if (existsSync(this.encryptedEnvFilePath)) {
            this.logger.warn(
                "Encrypted environment file found, but no 2FA URL provided. Ignoring..."
            );
        }

        await BannerPrinter.printBanner();
        this.logger.info("Starting master process");

        let restarts = 0;
        let lastRestart: number = 0;
        const promises = [];
        const exitStatus: { exited: boolean }[] = [];

        for (;;) {
            if (shardCount) {
                const abortController = new AbortController();

                for (let i = 0; i < shardCount; i++) {
                    const promise = this.createShard(
                        result,
                        i,
                        shardCount,
                        abortController.signal
                    );

                    exitStatus[i] = { exited: false };
                    promises[i] = promise.then(result => {
                        this.logger.error(`Shard #${i} errored`);
                        exitStatus[i] = { exited: true };

                        if (result === false) {
                            this.logger.error("Exiting in 5 seconds");
                            abortController.abort();
                            setTimeout(() => process.exit(-1), 5000);
                        }
                    });
                }

                for (;;) {
                    await Promise.race(promises);

                    for (let i = 0; i < shardCount; i++) {
                        if (!exitStatus[i].exited) {
                            continue;
                        }

                        const promise = this.createShard(
                            result,
                            i,
                            shardCount,
                            abortController.signal
                        );

                        exitStatus[i] = { exited: false };
                        promises[i] = promise.then(result => {
                            this.logger.error(`Shard #${i} errored`);
                            exitStatus[i] = { exited: true };

                            if (result === false) {
                                this.logger.error("Exiting in 5 seconds");
                                abortController.abort();
                                setTimeout(() => process.exit(-1), 5000);
                            }
                        });
                    }
                }
            } else {
                await this.createChild(result);
            }

            if (Date.now() - lastRestart <= 30000 && restarts >= 10) {
                this.logger.error("10 restarts in 30 seconds -- aborting now");
                process.exit(-1);
            }

            this.logger.info(
                "Main process exited, starting again in 5 seconds"
            );
            await new Promise<void>(resolve => setTimeout(resolve, 5000));
            lastRestart = Date.now();
            restarts++;
        }
    }
}

export default MasterProcessManager;
