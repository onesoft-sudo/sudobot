/*
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

import { Guild, TextChannel } from "discord.js";
import { logError } from "../components/io/Logger";
import Client from "../core/Client";
import { isTextableChannel } from "./utils";

export interface QueueConstructorOptions {
    client: Client;
    createdAt: Date;
    willRunAt: Date;
    guild: Guild;
    channelId?: string;
    messageId?: string;
    userId: string;
    filePath: string;
    args: string[];
    id?: number;
    name: string;
}

export default abstract class Queue {
    protected readonly client: Client;
    public readonly createdAt: Date;
    public readonly willRunAt: Date;
    public readonly guild: Guild;
    public readonly channelId: string | undefined;
    public readonly messageId: string | undefined;
    public readonly userId: string;
    public readonly filePath: string;
    public readonly args: string[] = [];

    constructor({
        client,
        createdAt,
        willRunAt,
        guild,
        channelId,
        messageId,
        userId,
        filePath,
        args
    }: QueueConstructorOptions) {
        this.client = client;
        this.createdAt = createdAt;
        this.willRunAt = willRunAt;
        this.guild = guild;
        this.channelId = channelId;
        this.messageId = messageId;
        this.userId = userId;
        this.filePath = filePath;
        this.args = args;
    }

    async channel() {
        if (!this.channelId) return;

        try {
            return await (this.guild.channels.cache.get(this.channelId) ??
                this.guild.channels.fetch(this.channelId));
        } catch (e) {
            logError(e);
            return null;
        }
    }

    async message(channel?: TextChannel) {
        if (!this.messageId) return null;

        try {
            const fetchedChannel = channel ?? (await this.channel());

            if (!fetchedChannel || !isTextableChannel(fetchedChannel)) return null;

            return (
                fetchedChannel.messages.cache.get(this.messageId) ??
                (await fetchedChannel.messages.fetch(this.messageId))
            );
        } catch (e) {
            logError(e);
            return null;
        }
    }

    abstract run(...args: string[]): Promise<unknown> | unknown;
}
