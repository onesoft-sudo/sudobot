/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025, 2026 OSN Developers.
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

import type Application from "@framework/app/Application";
import type AbstractQueuedJob from "@framework/queues/AbstractQueuedJob";
import Job from "@framework/queues/Job";
import type JobDatabaseDriver from "@framework/queues/JobDatabaseDriver";
import JobState from "@framework/queues/JobState";
import { Collection } from "discord.js";

class QueueManager {
    protected readonly queueHandlers = new Collection<
        // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
        Function | string,
        AbstractQueuedJob<object>
    >();

    public readonly scheduledJobs = new Collection<number, Job<object>>();
    protected readonly application: Application;
    public readonly driver: JobDatabaseDriver;

    public constructor(
        application: Application,
        driver: new (
            application: Application,
            manager: QueueManager
        ) => JobDatabaseDriver
    ) {
        this.application = application;
        this.driver = new driver(application, this);
    }

    public register(handler: AbstractQueuedJob<object>) {
        this.queueHandlers.set(handler.name, handler);
        this.queueHandlers.set(handler.constructor, handler);
    }

    public getScheduledJobs() {
        return this.scheduledJobs.values();
    }

    public getScheduledJob(id: number) {
        return this.scheduledJobs.get(id);
    }

    public async executeJob<T extends object>(
        job: Job<T>,
        handlerId: string,
        data: T | null
    ) {
        const handler = this.queueHandlers.get(handlerId);

        if (!handler) {
            return JobState.Failure;
        }

        try {
            return await handler.execute(data);
        }
        catch (error) {
            this.application.logger.error(
                `Uncaught error thrown from queued job #${job.id} (${handler.name})`,
                error
            );

            return JobState.Failure;
        }
    }

    public create<
        Q extends new (
            application: Application,
            manager: QueueManager
        ) => AbstractQueuedJob<object>
    >(
        handler: Q,
        options: QueueCreateOptions
    ): Job<QueueDataType<InstanceType<Q>>>;

    public create<T extends object = object>(
        handlerId: string,
        options: QueueCreateOptions
    ): Job<T>;

    public create(
        handlerResolvable:
            | (new (
                  application: Application,
                  manager: QueueManager
              ) => AbstractQueuedJob<object>)
            | string,
        options: QueueCreateOptions
    ) {
        const handler = this.queueHandlers.get(handlerResolvable);

        if (!handler) {
            throw new Error(
                `No such queue handler with ID: ${typeof handlerResolvable === "string" ? handlerResolvable : handlerResolvable.name}`
            );
        }

        return new Job(
            this,
            options.id,
            options.createdAt ?? new Date(),
            options.runsAt,
            handler.name,
            options.guildId ?? null,
            options.userId ?? null,
            options.channelId ?? null,
            options.messageId ?? null,
            options.repeat ?? false
        );
    }

    public async bulkCancel<T extends object>(
        handlerResolvable:
            | (new (
                  application: Application,
                  manager: QueueManager
              ) => AbstractQueuedJob<T>)
            | string,
        filter: (job: Job<T>) => boolean
    ) {
        const handler = this.queueHandlers.get(handlerResolvable);
        const jobs = new Set<Job<object>>();

        if (!handler) {
            throw new Error(
                `No such queue handler with ID: ${typeof handlerResolvable === "string" ? handlerResolvable : handlerResolvable.name}`
            );
        }

        for (const job of this.scheduledJobs.values()) {
            if (job.handlerId === handler.name && filter(job as Job<T>)) {
                try {
                    await job.cancel();
                } 
                catch (error) {
                    this.application.logger.debug(error);
                    continue;
                }

                jobs.add(job);
            }
        }

        return jobs;
    }
}

export type QueueDataType<Q extends AbstractQueuedJob<object>> = Exclude<
    Parameters<Q["execute"]>[0],
    null
>;

export type QueueCreateOptions = {
    id?: number;
    runsAt: Date | number;
    repeat?: boolean;
    guildId?: string;
    userId?: string;
    channelId?: string;
    messageId?: string;
    createdAt?: Date;
};

export default QueueManager;
