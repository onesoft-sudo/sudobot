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

import FileSystem from "@framework/polyfills/FileSystem";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { emoji } from "@framework/utils/emoji";
import archiver from "archiver";
import axios from "axios";
import chalk from "chalk";
import { spawnSync } from "child_process";
import { formatDistanceToNowStrict } from "date-fns";
import {
    ActivityType,
    APIEmbed,
    Attachment,
    AttachmentBuilder,
    Colors,
    escapeCodeBlock,
    WebhookClient
} from "discord.js";
import figlet from "figlet";
import { rm } from "fs/promises";
import path from "path";
import semver from "semver";
import { version } from "../../../../package.json";
import { HasEventListeners } from "../types/HasEventListeners";
import { safeChannelFetch, safeMessageFetch } from "../utils/fetch";
import { chunkedString, systemPrefix } from "../utils/utils";
import ConfigurationManager from "./ConfigurationManager";

const { BACKUP_CHANNEL_ID, ERROR_WEBHOOK_URL, BACKUP_STORAGE } = process.env;

@Name("startupManager")
class StartupManager extends Service implements HasEventListeners {
    public interval: Timer | undefined = undefined;
    public readonly packageJsonUrl =
        "https://raw.githubusercontent.com/onesoft-sudo/sudobot/main/package.json";

    public override async boot() {
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

            try {
                const { guildId, messageId, channelId, time } = (await FileSystem.readFileContents(
                    restartJsonFile,
                    { json: true }
                )) as {
                    guildId: string;
                    messageId: string;
                    channelId: string;
                    time: number;
                };

                const guild = this.application.getClient().guilds.cache.get(guildId);

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
                            description: `${emoji(
                                this.application.getClient(),
                                "check"
                            )} Operation completed. (took ${((Date.now() - time) / 1000).toFixed(
                                2
                            )}s)`
                        }
                    ]
                });
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
        process.on("unhandledRejection", (reason: unknown) => {
            process.removeAllListeners("unhandledRejection");
            this.application.logger.error(reason);
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
            this.application.logger.error(error);
            this.sendErrorLog(
                error.stack ??
                    `Uncaught ${error.name.trim() === "" ? "Error" : error.name}: ${error.message}`
            ).finally(() => process.exit(-1));
        });
    }

    private async sendConfigBackupCopy() {
        if (!BACKUP_CHANNEL_ID) {
            return;
        }

        const channel = this.client.channels.cache.get(BACKUP_CHANNEL_ID);

        if (!channel?.isTextBased()) {
            return;
        }

        const files: Array<string | AttachmentBuilder | Attachment> = [
            this.application.getService(ConfigurationManager).configPath,
            this.application.getService(ConfigurationManager).systemConfigPath
        ];

        if (BACKUP_STORAGE) {
            if (process.isBun) {
                this.application.logger.warn("Cannot create storage backup in a Bun environment");
                return;
            }

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
            archive.finalize();
        });
    }

    private setBackupQueue() {
        const time = process.env.BACKUP_INTERVAL
            ? parseInt(process.env.BACKUP_INTERVAL)
            : 1000 * 60 * 60 * 2;
        const finalTime = isNaN(time) ? 1000 * 60 * 60 * 2 : time;
        this.interval = setInterval(this.sendConfigBackupCopy.bind(this), finalTime);
        this.application.logger.info(
            `Configuration backups will be sent in each ${formatDistanceToNowStrict(
                new Date(Date.now() - finalTime)
            )}`
        );
        this.application.logger.info("Sending initial backup");
        this.sendConfigBackupCopy();
    }

    private systemUpdate(branch = "main") {
        if (spawnSync(`git pull origin ${branch}`).error?.message.endsWith("ENOENT")) {
            this.application.logger.error(
                "Cannot perform an automatic update - the system does not have Git installed and available in $PATH."
            );
            return false;
        }

        if (spawnSync("npm run build").error) {
            this.application.logger.error(
                "Cannot perform an automatic update - failed to build the project"
            );
            return false;
        }

        const { version } = require("../../package.json");
        this.application.logger.success(
            `Successfully completed automatic update - system upgraded to version ${version}`
        );
        return true;
    }

    private async checkForUpdate() {
        try {
            const response = await axios.get(this.packageJsonUrl);
            const newVersion = response.data?.version;

            if (
                typeof newVersion === "string" &&
                semver.gt(newVersion, this.application.metadata.version as string)
            ) {
                this.application.logger.info("Found update - performing an automatic update");
                this.systemUpdate();
            }
        } catch (e) {
            this.application.logger.error(e);
        }
    }
}

export default StartupManager;