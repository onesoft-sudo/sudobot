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

import path from "path";
import { log, logError } from "../components/io/Logger";
import Queue, { QueueConstructorOptions } from "./Queue";

export default class QueueEntry {
    timeout: Timer | undefined = undefined;
    public id: number = 0;
    public readonly creatingRecord: Promise<void> | undefined;

    constructor(public readonly options: QueueConstructorOptions) {
        if (options.id) this.id = options.id;
        else this.creatingRecord = this.createDatabaseRecord().catch(logError);

        log(options.filePath);
    }

    async createDatabaseRecord() {
        const { id } = await this.options.client.prisma.queue.create({
            data: {
                channel_id: this.options.channelId,
                file_name: path.basename(this.options.filePath),
                guild_id: this.options.guild.id,
                message_id: this.options.messageId,
                user_id: this.options.userId,
                willRunAt: this.options.willRunAt,
                args: this.options.args,
                name: this.options.name
            }
        });

        this.id = id;
    }

    async updateTime(time: Date) {
        await this.clearTimeout(false);
        this.options.willRunAt = time;

        await this.options.client.prisma.queue.update({
            where: {
                id: this.options.id
            },
            data: {
                willRunAt: time
            }
        });

        this.setTimeout();
    }

    async deleteDatabaseRecord() {
        log("Deleting", this.id);

        return await this.options.client.prisma.queue
            .delete({
                where: {
                    id: this.id
                }
            })
            .catch(logError);
    }

    async run(): Promise<void> {
        try {
            log("Running queue: ", this.options.filePath);
            const {
                default: QueueClass
            }: { default: new (options: QueueConstructorOptions) => Queue } = await import(
                this.options.filePath
            );
            const queue = new QueueClass(this.options);
            await queue.run(...this.options.args);
        } catch (e) {
            logError(e);
            logError("Error occurred during running the queue.");
        }

        this.options.client.queueManager.queues.delete(this.id.toString());
    }

    setTimeout() {
        log("Queue timeout set: ", path.basename(this.options.filePath));

        this.timeout = setTimeout(() => {
            this.run().catch(console.error);
            this.deleteDatabaseRecord().catch(logError);
        }, this.options.willRunAt.getTime() - Date.now());
    }

    clearTimeout(deleteRecord: boolean = false) {
        log(this.timeout);

        if (this.timeout === undefined) return;

        log("Queue timeout cleared: ", path.basename(this.options.filePath));

        clearTimeout(this.timeout);
        this.timeout = undefined;

        if (deleteRecord) return this.deleteDatabaseRecord();
    }
}
