/**
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

import { UserStatistics } from "@prisma/client";
import { Message, PartialMessage, Snowflake } from "discord.js";
import Service from "../core/Service";
import { HasEventListeners } from "../types/HasEventListeners";

export const name = "statsService";

type CacheEntry = Omit<UserStatistics, "id" | "createdAt" | "updatedAt"> & { id?: number; createdAt?: Date; updatedAt?: Date };

export default class StatsService extends Service implements HasEventListeners {
    protected readonly cache = new Map<`${Snowflake}_${Snowflake}`, CacheEntry>();
    protected hasQueue: boolean = false;

    getOrCreateUserInfo(guildId: string, userId: string, callback: (info: CacheEntry) => void) {
        const config = this.client.configManager.systemConfig?.statistics;
        const guildConfig = this.client.configManager.config[guildId]?.statistics;

        if (!config?.enabled || !guildConfig?.enabled) {
            return;
        }

        const key = `${guildId}_${userId}` as const;
        let info = this.cache.get(key);
        let setInfo = false;

        if (!info) {
            info = {
                guildId,
                userId,
                messagesSent: 0,
                messagesDeleted: 0,
                messagesEdited: 0
            } as UserStatistics;
            setInfo = true;
        }

        callback(info);

        if (setInfo) {
            this.cache.set(key, info);
        }

        if (!this.hasQueue) {
            this.hasQueue = true;

            setTimeout(async () => {
                await this.syncWithDatabase();
                this.hasQueue = false;
            }, config.sync_delay);
        }
    }

    onMessageCreate(message: Message<boolean>) {
        if (message.author.bot) {
            return;
        }

        this.getOrCreateUserInfo(message.guildId!, message.author.id, info => {
            info.messagesSent++;
        });
    }

    onMessageUpdate(oldMessage: Message<boolean> | PartialMessage, newMessage: Message<boolean> | PartialMessage) {
        if (!newMessage.author || newMessage.author.bot || !newMessage.guildId) {
            return;
        }

        this.getOrCreateUserInfo(newMessage.guildId, newMessage.author.id, info => {
            info.messagesEdited++;
        });
    }

    onMessageDelete(message: Message<boolean> | PartialMessage) {
        if (!message.author || !message.guildId! || message.author.bot) {
            return;
        }

        this.getOrCreateUserInfo(message.guildId, message.author.id, info => {
            info.messagesDeleted++;
        });
    }

    async syncWithDatabase() {
        const config = this.client.configManager.systemConfig?.statistics;

        if (!config?.enabled) {
            return;
        }

        const values = [...this.cache.values()];
        const existingRecords = (
            await this.client.prisma.userStatistics.findMany({
                where: {
                    id: {
                        in: values.filter(value => value.id !== undefined).map(value => value.id!)
                    }
                },
                select: {
                    id: true
                }
            })
        ).map(value => value.id);
        const toBeCreated = [];

        for (const value of values) {
            if (value.id !== undefined && existingRecords.includes(value.id)) {
                await this.client.prisma.userStatistics.update({
                    where: {
                        id: value.id
                    },
                    data: {
                        messagesDeleted: value.id,
                        messagesEdited: value.messagesEdited,
                        messagesSent: value.messagesSent,
                        userId: value.userId,
                        guildId: value.guildId
                    }
                });
            } else {
                toBeCreated.push(value);
            }
        }

        if (toBeCreated.length > 0) {
            await this.client.prisma.userStatistics.createMany({
                data: toBeCreated
            });
        }

        this.cache.clear();
    }
}
