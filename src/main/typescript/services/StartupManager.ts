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

import FileSystem from "@framework/polyfills/FileSystem";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { noOperation } from "@framework/utils/utils";
import { emoji } from "@main/utils/emoji";
import { version } from "@root/package.json";
import archiver from "archiver";
import axios from "axios";
import chalk from "chalk";
import { formatDistanceToNowStrict } from "date-fns";
import {
    ActivityType,
    APIEmbed,
    Attachment,
    AttachmentBuilder,
    Colors,
    escapeCodeBlock,
    Snowflake,
    WebhookClient
} from "discord.js";
import figlet from "figlet";
import { rm } from "fs/promises";
import path from "path";
import { setTimeout } from "timers/promises";
import { HasEventListeners } from "../types/HasEventListeners";
import { safeChannelFetch, safeMessageFetch } from "../utils/fetch";
import { chunkedString, isTextBasedChannel, systemPrefix } from "../utils/utils";
import ConfigurationManager from "./ConfigurationManager";

const { BACKUP_CHANNEL_ID, ERROR_WEBHOOK_URL, BACKUP_STORAGE } = process.env;

@Name("startupManager")
class StartupManager extends Service implements HasEventListeners {
    public interval: Timer | undefined = undefined;

    public override async boot() {
        this.setupEnvironment();
        await this.application.featureFlagManager.boot();
        const banner = await this.getBanner();
        console.info(chalk.blueBright(banner));
        console.info(`Version ${chalk.green(version)} -- Booting up`);
    }

    public getBanner() {
        return figlet.text("SudoBot", { font: "Standard" });
    }

    public setupEnvironment() {
        axios.defaults.headers.common["Accept-Encoding"] = "gzip";
    }

    public async onReady() {
        if (BACKUP_CHANNEL_ID) {
            this.setBackupQueue();
        }

        if (ERROR_WEBHOOK_URL) {
            this.application.logger.debug("Error webhook URL found. Setting up error handlers...");
            this.setupErrorHandlers();
        }

        const restartJsonFile = path.join(systemPrefix("tmp", true), "restart.json");

        if (await FileSystem.exists(restartJsonFile)) {
            this.application.logger.info("Found restart.json file: ", restartJsonFile);

            respond: try {
                const { guildId, messageId, channelId, time, metadata } = (await FileSystem.readFileContents(
                    restartJsonFile,
                    { json: true }
                )) as {
                    guildId?: string;
                    messageId?: string;
                    channelId?: string;
                    time: number;
                    metadata: unknown;
                };

                if (!guildId || !channelId || !messageId) {
                    break respond;
                }

                const guild = this.application.getClient().guilds.cache.get(guildId);

                if (!guild) {
                    break respond;
                }

                const channel = await safeChannelFetch(guild, channelId);

                if (!channel || !channel.isTextBased()) {
                    break respond;
                }

                const message = await safeMessageFetch(channel, messageId);

                if (!message) {
                    break respond;
                }

                if (metadata === "update") {
                    await message.edit({
                        embeds: [
                            {
                                author: {
                                    name: "System Update",
                                    icon_url: this.application.client.user?.displayAvatarURL() ?? undefined
                                },
                                color: Colors.Green,
                                description: `${emoji(this.application, "check")} System update successful. (took ${((Date.now() - time) / 1000).toFixed(2)}s)`,
                                timestamp: new Date().toISOString()
                            }
                        ]
                    });
                } else {
                    await message.edit({
                        embeds: [
                            {
                                color: Colors.Green,
                                description: `### ${emoji(this.application, "restart")} System Restart\n${emoji(
                                    this.application,
                                    "check"
                                )} Operation completed. (took ${((Date.now() - time) / 1000).toFixed(2)}s)`
                            }
                        ]
                    });
                }
            } catch (e) {
                this.application.logger.error(e);
            }

            rm(restartJsonFile).catch(this.application.logger.error);
        }

        const { presence } = this.application.getService(ConfigurationManager).systemConfig;

        this.client.user?.setPresence({
            activities: [
                {
                    name: presence?.name ?? "over the server",
                    type: ActivityType[presence?.type ?? "Watching"],
                    url: presence?.url
                }
            ],
            status: presence?.status ?? "dnd"
        });
    }

    public requestRestart({ channelId, guildId, message, messageId, waitFor, key, metadata }: RestartOptions = {}) {
        setTimeout(waitFor)
            .then(async () => {
                const restartJsonFile = path.join(systemPrefix("tmp", true), "restart.json");

                await FileSystem.writeFileContents(
                    restartJsonFile,
                    JSON.stringify({
                        guildId,
                        channelId,
                        messageId,
                        message,
                        time: Date.now(),
                        key,
                        metadata
                    })
                );

                this.application.logger.info("Restart requested. Shutting down...");

                if (message) {
                    this.application.logger.info(`Broadcasted Message: ${message}`);
                }

                process.exit(this.application.service("configManager").systemConfig.restart_exit_code);
            })
            .catch(this.application.logger.error);

        return message;
    }

    private async sendErrorLog(content: string) {
        const url = ERROR_WEBHOOK_URL;

        if (!url) {
            return;
        }

        const client = new WebhookClient({
            url
        });
        const chunks = chunkedString(content, 4000);
        const embeds: APIEmbed[] = [
            {
                title: "Fatal error",
                color: 0xf14a60,
                description: "```" + escapeCodeBlock(chunks[0]) + "```"
            }
        ];

        if (chunks.length > 1) {
            for (let i = 1; i < chunks.length; i++) {
                embeds.push({
                    color: 0xf14a60,
                    description: "```" + escapeCodeBlock(chunks[i]) + "```",
                    timestamp: i === chunks.length - 1 ? new Date().toISOString() : undefined
                });
            }
        } else {
            embeds[0].timestamp = new Date().toISOString();
        }

        await client
            .send({
                embeds
            })
            .catch(this.application.logger.error);
    }

    private setupErrorHandlers() {
        process.on("unhandledRejection", reason => {
            process.removeAllListeners("unhandledRejection");
            this.application.logger.error(reason);
            this.sendErrorLog(
                `Unhandled promise rejection: ${
                    reason instanceof Error
                        ? "\n" + reason.stack
                        : typeof reason === "string" || typeof (reason as string | undefined)?.toString === "function"
                          ? escapeCodeBlock(
                                (reason as string | undefined)?.toString
                                    ? (reason as string).toString()
                                    : (reason as string)
                            )
                          : (reason as string)
                }`
            )
                .catch(noOperation)
                .finally(() => process.exit(-1));
        });

        process.on("uncaughtException", (error: Error) => {
            process.removeAllListeners("uncaughtException");
            this.application.logger.error(error);
            this.sendErrorLog(
                error.stack ?? `Uncaught ${error.name.trim() === "" ? "Error" : error.name}: ${error.message}`
            )
                .catch(noOperation)
                .finally(() => process.exit(-1));
        });
    }

    private async sendConfigBackupCopy() {
        if (!BACKUP_CHANNEL_ID) {
            return;
        }

        const channel = this.client.channels.cache.get(BACKUP_CHANNEL_ID);

        if (!channel || !isTextBasedChannel(channel)) {
            return;
        }

        const files: Array<string | AttachmentBuilder | Attachment> = [
            this.application.getService(ConfigurationManager).configPath,
            this.application.getService(ConfigurationManager).systemConfigPath
        ];

        if (BACKUP_STORAGE) {
            const buffer = await this.makeStorageBackup();

            if (buffer.byteLength > 80 * 1024 * 1024) {
                this.application.logger.error("Storage backup is too large to send to Discord");
                return;
            }

            files.push(
                new AttachmentBuilder(buffer, {
                    name: "storage.zip"
                })
            );

            this.application.logger.info("Storage backup created");
        }

        await channel
            ?.send({
                content: "# Configuration Backup",
                files
            })
            .catch(this.application.logger.error);
    }

    private makeStorageBackup() {
        return new Promise<Buffer>((resolve, reject) => {
            const archive = archiver("zip", {
                zlib: { level: 9 }
            });

            const bufferList: Buffer[] = [];

            archive.on("data", data => {
                bufferList.push(data);
            });

            archive.on("end", () => {
                const resultBuffer = Buffer.concat(bufferList);
                resolve(resultBuffer);
            });

            archive.on("error", err => {
                reject(err);
            });

            archive.directory(systemPrefix("storage", true), false);
            archive.finalize().catch(reject);
        });
    }

    private setBackupQueue() {
        const time = process.env.BACKUP_INTERVAL ? parseInt(process.env.BACKUP_INTERVAL) : 1000 * 60 * 60 * 2;
        const finalTime = isNaN(time) ? 1000 * 60 * 60 * 2 : time;
        this.interval = setInterval(this.sendConfigBackupCopy.bind(this), finalTime);
        this.application.logger.info(
            `Configuration backups will be sent in each ${formatDistanceToNowStrict(new Date(Date.now() - finalTime))}`
        );
        this.application.logger.info("Sending initial backup");
        this.sendConfigBackupCopy().catch(this.application.logger.error);
    }
}

type RestartOptions = {
    message?: string;
    waitFor?: number;
    channelId?: Snowflake;
    guildId?: Snowflake;
    messageId?: Snowflake;
    key?: string | null;

    /**
     * Metadata to store in the restart.json file.
     */
    metadata?: unknown;
};

export default StartupManager;
