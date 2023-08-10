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

import { formatDistanceToNowStrict } from "date-fns";
import { APIEmbed, Colors, WebhookClient, escapeCodeBlock } from "discord.js";
import { existsSync, readFileSync } from "fs";
import { rm } from "fs/promises";
import path from "path";
import Service from "../core/Service";
import { GatewayEventListener } from "../decorators/GatewayEventListener";
import { HasEventListeners } from "../types/HasEventListeners";
import { safeChannelFetch, safeMessageFetch } from "../utils/fetch";
import { log, logError, logInfo } from "../utils/logger";
import { chunkedString, getEmoji, sudoPrefix } from "../utils/utils";

export const name = "startupManager";

const { BACKUP_CHANNEL_ID, ERROR_WEKHOOK_URL } = process.env;

export default class StartupManager extends Service implements HasEventListeners {
    interval: NodeJS.Timer | undefined = undefined;

    @GatewayEventListener("ready")
    async onReady() {
        if (BACKUP_CHANNEL_ID) {
            this.setBackupQueue();
        }

        if (ERROR_WEKHOOK_URL) {
            log("Error webhook URL found. Setting up error handlers...");
            this.setupErrorHandlers();
        }

        const restartJsonFile = path.join(sudoPrefix("tmp", true), "restart.json");

        if (existsSync(restartJsonFile)) {
            logInfo("Found restart.json file: ", restartJsonFile);

            try {
                const { guildId, messageId, channelId, time } = JSON.parse(readFileSync(restartJsonFile, { encoding: "utf-8" }));

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
                            description: `${getEmoji(this.client, "check")} Operation completed. (took ${(
                                (Date.now() - time) /
                                1000
                            ).toFixed(2)}s)`
                        }
                    ]
                });
            } catch (e) {
                logError(e);
            }

            rm(restartJsonFile).catch(logError);
        }
    }

    async sendErrorLog(content: string) {
        const url = ERROR_WEKHOOK_URL;

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
                    typeof reason === "string" || typeof (reason as any)?.toString === "function"
                        ? escapeCodeBlock((reason as any)?.toString ? (reason as any).toString() : (reason as any))
                        : reason
                }`
            ).finally(() => process.exit(-1));
        });

        process.on("uncaughtException", async (error: Error) => {
            process.removeAllListeners("uncaughtException");
            logError(error);
            this.sendErrorLog(
                error.stack ?? `Uncaught ${error.name.trim() === "" ? "Error" : error.name}: ${error.message}`
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

        await channel
            ?.send({
                content: "# Configuration Backup",
                files: [this.client.configManager.configPath, this.client.configManager.systemConfigPath]
            })
            .catch(logError);
    }

    setBackupQueue() {
        const time = process.env.BACKUP_INTERVAL ? parseInt(process.env.BACKUP_INTERVAL) : 1000 * 60 * 60 * 2;
        const finalTime = isNaN(time) ? 1000 * 60 * 60 * 2 : time;
        this.interval = setInterval(this.sendConfigBackupCopy.bind(this), finalTime);
        logInfo(`Configuration backups will be sent in each ${formatDistanceToNowStrict(new Date(Date.now() - finalTime))}`);
        logInfo(`Sending initial backup`);
        this.sendConfigBackupCopy();
    }
}
