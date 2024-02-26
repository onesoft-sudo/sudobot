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

import { Collection } from "discord.js";
import path from "path";
import Service from "../core/Service";
import QueueEntry from "../utils/QueueEntry";
import { log, logError } from "../utils/Logger";

export const name = "queueManager";

export default class QueueManager extends Service {
    queues = new Collection<string, QueueEntry>();

    async onReady() {
        const queuesInDatabase = await this.client.prisma.queue.findMany();

        log(`Found ${queuesInDatabase.length} queues since the last startup.`);

        for (const queue of queuesInDatabase) {
            try {
                log(queue.guild_id, path.resolve(__dirname, "../queues/", queue.file_name));

                const entry = new QueueEntry({
                    channelId: queue.channel_id ?? undefined,
                    client: this.client,
                    createdAt: queue.createdAt,
                    guild: this.client.guilds.cache.get(queue.guild_id) || (await this.client.guilds.fetch(queue.guild_id)!),
                    messageId: queue.message_id ?? undefined,
                    willRunAt: queue.willRunAt,
                    filePath: path.resolve(__dirname, "../queues/", queue.file_name),
                    args: queue.args,
                    id: queue.id,
                    userId: queue.user_id,
                    name: queue.name
                });

                if (queue.willRunAt.getTime() <= Date.now()) {
                    await entry.run().catch(logError);
                    await entry.deleteDatabaseRecord();
                    continue;
                }

                this.queues.set(`${queue.id}`, entry);
                entry.setTimeout();
            } catch (e) {
                log(e);
                continue;
            }
        }
    }

    async add(queue: QueueEntry) {
        if (queue.creatingRecord) await queue.creatingRecord;

        this.queues.set(queue.id.toString(), queue);
        queue.setTimeout();
        return queue.id;
    }

    async remove(queue: QueueEntry) {
        if (queue.creatingRecord) await queue.creatingRecord;

        this.queues.delete(queue.id.toString());
        await queue.clearTimeout(true);
        return queue.id;
    }

    async removeById(id: number) {
        const queue = this.queues.get(id.toString());

        if (!queue) return null;

        return await this.remove(queue);
    }
}
