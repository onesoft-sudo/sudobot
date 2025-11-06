import Service from "@framework/services/Service";
import FileSystem from "@framework/polyfills/FileSystem";
import chalk from "chalk";
import figlet from "figlet";
import { version } from "@root/package.json";
import axios from "axios";
import { chunkedString, systemPrefix } from "@main/utils/utils";
import path from "path";
import { Colors, ActivityType, type Snowflake, escapeCodeBlock, WebhookClient, type APIEmbed } from "discord.js";
import { rm } from "fs/promises";
import { fetchChannel, fetchMessage } from "@framework/utils/entities";
import { emoji } from "@framework/utils/emoji";
import { setTimeout } from "timers/promises";
import { isDiscordAPIError } from "@framework/utils/errors";
import { noOperation } from "@framework/utils/utils";

export const SERVICE_STARTUP_MANAGER = "startupManagerService" as const;

const { ERROR_WEBHOOK_URL } = process.env;

class StartupManagerService extends Service {
    public override readonly name: string = SERVICE_STARTUP_MANAGER;

    private async printBanner() {
        console.info();
        console.info(chalk.blueBright((await figlet.text("SudoBot")).replace(/\s+$/, "")));
        console.info();
        console.info(`      Version ${chalk.green(version)} -- booting up`);
        console.info();
    }

    public override async boot(): Promise<void> {
        await this.printBanner();
        axios.defaults.headers.common["Accept-Encoding"] = "gzip";
    }

    public async onReady() {
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

                const guild = this.application.client.guilds.cache.get(guildId);

                if (!guild) {
                    break respond;
                }

                const channel = await fetchChannel(guild, channelId);

                if (!channel || !channel.isTextBased()) {
                    break respond;
                }

                const message = await fetchMessage(channel, messageId);

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

        this.application.client.user?.setPresence({
            activities: [
                {
                    name: presence?.name ?? "over the server",
                    type: ActivityType[presence?.type ?? "Watching"] as unknown as ActivityType,
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

    private errorToString(error: Error): string {
        return `${error.stack}${"code" in error ? `\nCode: ${error.code}` : ""}${error ? `\nCaused by: ${error.cause instanceof Error ? this.errorToString(error.cause) : `${error.cause}`}` : ""}`;
    }

    private setupErrorHandlers() {
        process.on("unhandledRejection", reason => {
            process.removeAllListeners("unhandledRejection");
            this.application.logger.error(reason);
            this.sendErrorLog(
                `Unhandled promise rejection:\n${
                    isDiscordAPIError(reason)
                        ? `Method: ${reason.method}\nEndpoint: ${reason.url}\nStatus: ${reason.status}\n` +
                          this.errorToString(reason)
                        : reason instanceof Error
                          ? this.errorToString(reason)
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

export default StartupManagerService;
