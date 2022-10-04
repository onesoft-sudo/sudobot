/**
* This file is part of SudoBot.
* 
* Copyright (C) 2021-2022 OSN Inc.
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
import DiscordClient from "../client/Client";
import QueuedJob from "../models/QueuedJob";
import Queue, { QueueOptions } from "../utils/structures/Queue";
import Service from "../utils/structures/Service";
import path from "path";
import { generate as randomstring } from 'randomstring';

export type QueueCreateOptions = {
    data?: { [key: string | number]: any };
    runAt?: Date;
    runAfter?: number;
    guild?: string;
};

export default class QueueManager extends Service {
    public readonly queues: Collection<string, Queue> = new Collection();

    async loadQueues() {
        const models = await QueuedJob.find();

        for await (const model of models) {
            const { default: Queue }: { default: new (client: DiscordClient, queueOptions: QueueOptions) => Queue } = await import(path.resolve(__dirname, '../queues/', model.className));
            console.log(Queue);
            this.queues.set(model.uuid, new Queue(this.client, { model, id: model.uuid, runAt: model.runOn }));
            console.log("Found queue: ", model.className);
        }
    }

    setQueue(queue: Queue) {
        this.queues.set(queue.id, queue);
    }

    cancelQueue(id: string) {
        return this.queues.get(id)?.cancel();
    }

    async addQueue(queueClass: new (client: DiscordClient, queueOptions: QueueOptions) => Queue, { data, runAt, runAfter, guild }: QueueCreateOptions) {
        if (runAfter !== 0 && runAfter !== 0 && !runAfter && !runAt) {
            throw new Error("One of runAfter or runAt must be specified for creating a queue");
        }

        const id = randomstring(7);
        const model = await QueuedJob.create({ uuid: id, data, runOn: runAfter ? new Date(Date.now() + runAfter) : runAt!, createdAt: new Date(), className: queueClass.name, guild });
        const queue = new queueClass(this.client, { model, id, runAt, runAfter });
        this.setQueue(queue);
        return queue;
    }

    runQueue(id: string) {
        return this.queues.get(id)?.run();
    }

    removeQueue(queue: Queue) {
        const { id } = queue;
        this.queues.delete(id);
    }
}   