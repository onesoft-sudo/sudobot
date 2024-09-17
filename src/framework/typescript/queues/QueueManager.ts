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

import { HasApplication } from "../types/HasApplication";
import type Queue from "./Queue";
import type { QueueOptions, StorableData } from "./Queue";

export type QueueClass<T extends StorableData = StorableData> = typeof Queue<T>;
export type QueueConstructor<T extends StorableData = StorableData> = new (
    ...args: ConstructorParameters<QueueClass<T>>
) => Queue<T>;

class QueueManager extends HasApplication {
    protected readonly queueClasses: Map<string, QueueConstructor<StorableData> | QueueClass> =
        new Map();
    protected readonly scheduledQueues: Map<number, Queue> = new Map();

    public clearRegisteredQueues(): void {
        this.queueClasses.clear();
    }

    public register(queue: QueueClass, name?: string): void {
        if (this.queueClasses.has(name ?? queue.uniqueName)) {
            throw new Error(`Queue with name ${queue.uniqueName} is already registered`);
        }

        this.queueClasses.set(name ?? queue.uniqueName, queue);
    }

    public get(name: string): QueueConstructor<StorableData> | undefined {
        return this.queueClasses.get(name) as QueueConstructor<StorableData> | undefined;
    }

    public getJobs(): ReadonlyMap<number, Queue> {
        return this.scheduledQueues;
    }

    public getJob(id: number) {
        return this.scheduledQueues.get(id);
    }

    public create<T extends StorableData>(
        queue: string | QueueClass,
        options: QueueOptions<T>
    ): Queue<T> {
        const QueueClass =
            typeof queue === "string"
                ? (this.get(queue) as QueueConstructor<T> | undefined)
                : (queue as unknown as QueueConstructor<T>);

        if (!QueueClass) {
            throw new Error(`Queue with name ${queue} not found`);
        }

        return new QueueClass(this.application, this, options);
    }

    public async bulkCancel<T extends StorableData>(
        type: QueueClass<T>,
        filter: (queue: Queue<NoInfer<T>>) => boolean
    ) {
        for (const queue of this.scheduledQueues.values()) {
            // noinspection SuspiciousTypeOfGuard
            if (queue instanceof type && filter(queue as Queue<NoInfer<T>>)) {
                await queue.cancel();
            }
        }
    }

    public add(queue: Queue) {
        const id = queue.id;

        if (!id) {
            throw new Error("Queue ID is undefined/null");
        }

        this.scheduledQueues.set(id, queue);
    }

    public remove(queue: Queue) {
        const id = queue.id;

        if (!id) {
            throw new Error("Queue ID is undefined/null");
        }

        this.scheduledQueues.delete(id);
    }
}

export default QueueManager;
