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

import archiver from "archiver";
import axios from "axios";
import chalk from "chalk";
import { spawnSync } from "child_process";
import { formatDistanceToNowStrict } from "date-fns";
import {
    APIEmbed,
    ActivityType,
    Attachment,
    AttachmentBuilder,
    Colors,
    WebhookClient,
    escapeCodeBlock
} from "discord.js";
import figlet from "figlet";
import { existsSync, readFileSync } from "fs";
import { rm } from "fs/promises";
import path from "path";
import { gt } from "semver";
import { version } from "../../package.json";
import Service from "../core/Service";
import { HasEventListeners } from "../types/HasEventListeners";
import { log, logError, logInfo, logSuccess } from "../utils/Logger";
import { safeChannelFetch, safeMessageFetch } from "../utils/fetch";
import { chunkedString, getEmoji, sudoPrefix } from "../utils/utils";

export const name = "startupManager";

const { BACKUP_CHANNEL_ID, ERROR_WEBHOOK_URL, BACKUP_STORAGE } = process.env;

export default class StartupManager extends Service implements HasEventListeners {
    interval: Timer | undefined = undefined;
    readonly packageJsonUrl =
        "https://raw.githubusercontent.com/onesoft-sudo/sudobot/main/package.json";

    async onReady() {
        if (BACKUP_CHANNEL_ID) {
            this.setBackupQueue();
        }

        if (ERROR_WEBHOOK_URL) {
            log("Error webhook URL found. Setting up error handlers...");
            this.setupErrorHandlers();
        }

        const restartJsonFile = path.join(sudoPrefix("tmp", true), "restart.json");

        if (existsSync(restartJsonFile)) {
            logInfo("Found restart.json file: ", restartJsonFile);

            try {
                const { guildId, messageId, channelId, time } = JSON.parse(
                    readFileSync(restartJsonFile, { encoding: "utf-8" })
                );

                const guild = this.client.guilds.cache.get(guildId);

                if (!guild) {
                    return;
                }

                const channel = await safeChannelFetch(guild, channelId);

                if (!channel || !channel.isTextBased()) {
                    return;
                }

                const message = await safeMessageFetch(channel, messageId);

                if (!message) {
                    return;
                }

                await message.edit({
                    embeds: [
                        {
                            color: Colors.Green,
                            title: "System Restart",
                            description: `${getEmoji(
                                this.client,
                                "check"
                            )} Operation completed. (took ${((Date.now() - time) / 1000).toFixed(
                                2
                            )}s)`
                        }
                    ]
                });
            } catch (e) {
                logError(e);
            }

            rm(restartJsonFile).catch(logError);
        }

        const { presence } = this.client.configManager.systemConfig;

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

    async sendErrorLog(content: string) {
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
            .catch(logError);
    }

    setupErrorHandlers() {
        process.on("unhandledRejection", (reason: unknown) => {
            process.removeAllListeners("unhandledRejection");
            logError(reason);
            this.sendErrorLog(
                `Unhandled promise rejection: ${
                    typeof reason === "string" ||
                    typeof (reason as string | undefined)?.toString === "function"
                        ? escapeCodeBlock(
                              (reason as string | undefined)?.toString
                                  ? (reason as string).toString()
                                  : (reason as string)
                          )
                        : reason
                }`
            ).finally(() => process.exit(-1));
        });

        process.on("uncaughtException", async (error: Error) => {
            process.removeAllListeners("uncaughtException");
            logError(error);
            this.sendErrorLog(
                error.stack ??
                    `Uncaught ${error.name.trim() === "" ? "Error" : error.name}: ${error.message}`
            ).finally(() => process.exit(-1));
        });
    }

    async sendConfigBackupCopy() {
        if (!BACKUP_CHANNEL_ID) {
            return;
        }

        const channel = this.client.channels.cache.get(BACKUP_CHANNEL_ID);

        if (!channel?.isTextBased()) {
            return;
        }

        const files: Array<string | AttachmentBuilder | Attachment> = [
            this.client.configManager.configPath,
            this.client.configManager.systemConfigPath
        ];

        if (BACKUP_STORAGE) {
            if (process.isBun) {
                logError("Cannot create storage backup in a Bun environment");
                return;
            }

            const buffer = await this.makeStorageBackup();

            // check for discord max attachment size limit
            if (buffer.byteLength > 80 * 1024 * 1024) {
                logError("Storage backup is too large to send to Discord");
                return;
            }

            files.push(
                new AttachmentBuilder(buffer, {
                    name: "storage.zip"
                })
            );

            logInfo("Storage backup created");
        }

        await channel
            ?.send({
                content: "# Configuration Backup",
                files
            })
            .catch(logError);
    }

    makeStorageBackup() {
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

            archive.directory(sudoPrefix("storage", true), false);
            archive.finalize();
        });
    }

    setBackupQueue() {
        const time = process.env.BACKUP_INTERVAL
            ? parseInt(process.env.BACKUP_INTERVAL)
            : 1000 * 60 * 60 * 2;
        const finalTime = isNaN(time) ? 1000 * 60 * 60 * 2 : time;
        this.interval = setInterval(this.sendConfigBackupCopy.bind(this), finalTime);
        logInfo(
            `Configuration backups will be sent in each ${formatDistanceToNowStrict(
                new Date(Date.now() - finalTime)
            )}`
        );
        logInfo("Sending initial backup");
        this.sendConfigBackupCopy();
    }

    systemUpdate(branch = "main") {
        if (spawnSync(`git pull origin ${branch}`).error?.message.endsWith("ENOENT")) {
            logError(
                "Cannot perform an automatic update - the system does not have Git installed and available in $PATH."
            );
            return false;
        }

        if (spawnSync("npm run build").error) {
            logError("Cannot perform an automatic update - failed to build the project");
            return false;
        }

        const { version } = require("../../package.json");
        logSuccess(
            `Successfully completed automatic update - system upgraded to version ${version}`
        );
        return true;
    }

    async checkForUpdate() {
        try {
            const response = await axios.get(this.packageJsonUrl);
            const newVersion = response.data?.version;

            if (
                typeof newVersion === "string" &&
                gt(newVersion, this.client.metadata.data.version)
            ) {
                logInfo("Found update - performing an automatic update");
                this.systemUpdate();
            }
        } catch (e) {
            logError(e);
        }
    }

    boot() {
        return new Promise<void>((resolve, reject) => {
            figlet.text(
                "SudoBot",
                {
                    font: "Standard"
                },
                (error, data) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    console.info(chalk.blueBright(data));
                    console.info(`Version ${chalk.green(version)} -- Booting up`);
                    resolve();
                }
            );
        });
    }
}
