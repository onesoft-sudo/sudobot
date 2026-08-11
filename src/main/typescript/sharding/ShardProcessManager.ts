import { Logger } from "@framework/log/Logger.js";
import Resource from "@framework/resources/Resource.js";
import AppKernel from "@main/core/AppKernel.js";
import Application from "@main/core/Application.js";
import { setEnv } from "@main/env/env.js";
import BannerPrinter from "@main/sharding/BannerPrinter.js";
import { IPCMessageType } from "@main/sharding/IPCMessageType.js";
import { version } from "discord.js";
import type { DotenvParseOutput } from "dotenv";
import path from "node:path";

class ShardProcessManager {
    private readonly logger = Logger.getLogger(ShardProcessManager);

    public async start(shards: Set<number>, shardCount: number | undefined) {
        if (shardCount === undefined) {
            await BannerPrinter.printBanner();
        }

        await this.loadEnvironmentData();

        Application.setupGlobals();
        Resource.registerResourcePaths(
            path.resolve(import.meta.dirname, "../resources")
        );

        const rootDirectoryPath = path.resolve(import.meta.dirname);
        const projectRootDirectoryPath = path.resolve(
            import.meta.dirname,
            "../../.."
        );

        const application = new Application({
            rootDirectoryPath,
            projectRootDirectoryPath,
            version: process.env.SUDOBOT_VERSION ?? version,
            shards: shards.size === 0 ? undefined : Array.from(shards),
            shardCount: shards.size === 0 ? undefined : shardCount
        });

        await application.run(
            new AppKernel({
                shards: shards.size === 0 ? undefined : Array.from(shards),
                shardCount: shards.size === 0 ? undefined : shardCount
            })
        );
    }

    private async loadEnvironmentData() {
        if (!process.send) {
            return;
        }

        await new Promise<void>((resolve, reject) => {
            process.once("message", message => {
                const messageData =
                    message && typeof message === "object"
                        ? (message as {
                              type: IPCMessageType;
                              data?: unknown;
                          })
                        : null;

                if (messageData?.type === IPCMessageType.SECRETS) {
                    const data = messageData?.data as DotenvParseOutput;

                    if (!data) {
                        process.send?.({ type: IPCMessageType.SECRETS_ACK });
                        resolve();
                        return;
                    }

                    setEnv({
                        ...process.env,
                        ...data
                    });

                    Object.assign(process.env, data);

                    this.logger.success("Successfully loaded environment data");
                    process.send?.({ type: IPCMessageType.SECRETS_ACK });
                    resolve();
                    return;
                }

                reject(new Error("Invalid IPC message received"));
            });

            process.send?.({ type: IPCMessageType.READY });
        });
    }
}

export default ShardProcessManager;
