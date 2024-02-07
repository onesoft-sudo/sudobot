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

import { GuildMember, Message, PermissionFlagsBits, Snowflake, TextChannel } from "discord.js";
import Service from "../core/Service";
import { GuildConfig } from "../types/GuildConfigSchema";
import { log, logError } from "../utils/logger";
import { isImmuneToAutoMod, isTextableChannel } from "../utils/utils";

interface SpamUserInfo {
    timestamps: number[];
    timeout?: Timer;
}

interface SimilarMessageSpamInfo {
    content?: string;
    count: number;
    timeout?: Timer;
}

export const name = "antispam";

export default class Antispam extends Service {
    protected readonly map: Record<`${Snowflake}_${Snowflake}`, SpamUserInfo | undefined> = {};
    protected readonly similarMessageSpamMap: Record<`${Snowflake}_${Snowflake}`, SimilarMessageSpamInfo | undefined> = {};

    async muteUser(message: Message, antispam: GuildConfig["antispam"]) {
        this.client.infractionManager
            .createMemberMute(message.member as GuildMember, {
                guild: message.guild!,
                moderator: this.client.user!,
                bulkDeleteReason: "The system has detected spam messages from this user",
                duration: antispam?.mute_duration && antispam?.mute_duration > 0 ? antispam?.mute_duration : 1000 * 60 * 60,
                messageChannel:
                    antispam?.action === "mute_clear" || antispam?.action === "auto"
                        ? (message.channel! as TextChannel)
                        : undefined,
                notifyUser: true,
                reason: "Spam detected",
                sendLog: true,
                autoRemoveQueue: true
            })
            .catch(logError);
    }

    async warnUser(message: Message, antispam: GuildConfig["antispam"]) {
        this.client.infractionManager
            .createMemberWarn(message.member as GuildMember, {
                guild: message.guild!,
                moderator: this.client.user!,
                notifyUser: true,
                reason: `Spam detected.${
                    antispam?.action === "auto" ? " If you continue to send spam messages, you might get muted." : ""
                }`,
                sendLog: true
            })
            .catch(logError);
    }

    async verballyWarnUser(message: Message) {
        await message.channel
            .send({
                content: `Hey ${message.author.toString()}, don't spam here!`
            })
            .catch(logError);
    }

    async takeAction(message: Message) {
        log("Triggered");

        const config = this.client.configManager.config[message.guildId!];

        if (!config) return;

        const { antispam } = config;

        if (antispam?.action === "mute_clear" || antispam?.action === "mute") {
            await this.muteUser(message, antispam);
        } else if (antispam?.action === "warn") {
            await this.warnUser(message, antispam);
        } else if (antispam?.action === "verbal_warn") {
            await this.verballyWarnUser(message);
        } else if (antispam?.action === "auto") {
            let record = await this.client.prisma.spamRecord.findFirst({
                where: {
                    guild_id: message.guildId!,
                    user_id: message.author.id
                }
            });

            if (!record) {
                record = await this.client.prisma.spamRecord.create({
                    data: {
                        guild_id: message.guildId!,
                        user_id: message.author.id,
                        level: 1
                    }
                });
            } else {
                await this.client.prisma.spamRecord.update({
                    data: {
                        level: {
                            increment: 1
                        }
                    },
                    where: {
                        id: record.id
                    }
                });
            }

            if (record.level === 1) {
                await this.verballyWarnUser(message);
            } else if (record.level === 2) {
                await this.warnUser(message, antispam);
            } else {
                await this.muteUser(message, antispam);
            }
        }
    }

    async checkForSimilarMessages(message: Message, config: GuildConfig) {
        if (
            !config.antispam?.similar_messages?.max ||
            config.antispam?.similar_messages?.max < 0 ||
            message.content.trim() === ""
        ) {
            return false;
        }

        const channels = config.antispam?.similar_messages?.channels;

        if (typeof channels === "boolean" && !channels) {
            return false;
        }

        if (channels !== true && !channels?.includes(message.channelId)) {
            return false;
        }

        const lastMessageInfo = this.similarMessageSpamMap[`${message.guildId!}_${message.author.id}`];

        if (!lastMessageInfo) {
            this.similarMessageSpamMap[`${message.guildId!}_${message.author.id}`] = {
                count: 0,
                content: message.content,
                timeout: setTimeout(() => {
                    const lastMessageInfo = this.similarMessageSpamMap[`${message.guildId!}_${message.author.id}`];
                    const max = config.antispam?.similar_messages?.max;

                    if (lastMessageInfo && max && lastMessageInfo.count >= max) {
                        lastMessageInfo.count = 0;
                        this.takeAction(message).catch(console.error);
                    }

                    this.similarMessageSpamMap[`${message.guildId!}_${message.author.id}`] = undefined;
                }, config.antispam.similar_messages?.timeframe ?? config.antispam.timeframe)
            };

            return false;
        }

        if (message.content === lastMessageInfo.content) {
            log("Similar message found");
            lastMessageInfo.count++;
        } else {
            log("Similar message count reset");
            lastMessageInfo.count = 0;
        }

        this.similarMessageSpamMap[`${message.guildId!}_${message.author.id}`] = lastMessageInfo;
        return false;
    }

    async onMessageCreate(message: Message) {
        if (!isTextableChannel(message.channel)) return;

        const config = this.client.configManager.config[message.guildId!];

        if (
            !config?.antispam?.enabled ||
            !config?.antispam.limit ||
            !config?.antispam.timeframe ||
            config.antispam.limit < 1 ||
            config.antispam.timeframe < 1 ||
            config.antispam.disabled_channels.includes(message.channelId!)
        ) {
            return;
        }

        if (await isImmuneToAutoMod(this.client, message.member!, PermissionFlagsBits.ManageMessages)) {
            return;
        }

        const result = await this.checkForSimilarMessages(message, config);

        if (result) {
            return;
        }

        const info = this.map[`${message.guildId!}_${message.author.id}`] ?? ({} as SpamUserInfo);

        info.timestamps ??= [];
        info.timestamps.push(Date.now());

        log("Pushed");

        if (!info.timeout) {
            log("Timeout set");

            info.timeout = setTimeout(() => {
                const delayedInfo = this.map[`${message.guildId!}_${message.author.id}`] ?? ({} as SpamUserInfo);
                const timestamps = delayedInfo.timestamps.filter(
                    timestamp => config.antispam?.timeframe! + timestamp >= Date.now()
                );

                if (timestamps.length >= config.antispam?.limit!) {
                    this.takeAction(message).catch(console.error);
                }

                this.map[`${message.guildId!}_${message.author.id}`] = undefined;
                log("Popped");
            }, config.antispam.timeframe);
        }

        this.map[`${message.guildId!}_${message.author.id}`] = info;
    }
}
