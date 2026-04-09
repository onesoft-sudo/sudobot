/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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

import type AbstractQueuedJob from "@framework/queues/AbstractQueuedJob";
import type { QueueClass } from "@framework/queues/AbstractQueuedJob";
import type Job from "@framework/queues/Job";
import type { QueueCreateOptions } from "@framework/queues/QueueManager";
import QueueManager from "@framework/queues/QueueManager";
import Service from "@framework/services/Service";
import type Application from "@main/core/Application";
import PgJobDatabaseDriver from "@main/database/PgJobDatabaseDriver";
import { queuedJobs } from "@main/models/QueuedJob";
import { inArray, isNotNull } from "drizzle-orm";

export const SERVICE_QUEUE_MANAGER = "queueManagerService";

class QueueManagerService extends Service {
    declare public readonly application: Application;
    public override readonly name: string = SERVICE_QUEUE_MANAGER;

    protected readonly queueManager: QueueManager;

    public constructor(application: Application) {
        super(application);

        this.queueManager = new QueueManager(
            this.application,
            PgJobDatabaseDriver
        );
    }

    public async onReady() {
        await this.sync();
    }

    public register(queue: AbstractQueuedJob<object>): void {
        this.queueManager.register(queue);
    }

    public getScheduledJobs() {
        return this.queueManager.getScheduledJobs();
    }

    public getScheduledJob(id: number) {
        return this.queueManager.getScheduledJob(id);
    }

    public async sync(): Promise<void> {
        const jobs = await this.application.database.query.queuedJobs.findMany({
            where: isNotNull(queuedJobs.runsAt)
        });

        const jobsToDelete = [];

        for (const queueInfo of jobs) {
            const {
                name,
                runsAt,
                channelId,
                createdAt,
                data,
                guildId,
                id,
                messageId,
                userId
            } = queueInfo;

            if (!runsAt) {
                continue;
            }

            let queue: Job<object>;

            try {
                queue = this.queueManager.create<object>(name, {
                    guildId: guildId ?? undefined,
                    userId: userId ?? undefined,
                    channelId: channelId ?? undefined,
                    messageId: messageId ?? undefined,
                    runsAt,
                    id,
                    createdAt: createdAt ?? undefined
                });
            } catch (error) {
                this.application.logger.error(error);
                jobsToDelete.push(id);
                continue;
            }

            this.application.logger.debug(queue.id);

            if (runsAt.getTime() <= Date.now()) {
                queue
                    .immediateRun(data as object | null)
                    .catch(this.application.logger.error);
                this.application.logger.debug("Immediate run", queue.id);
                continue;
            }

            await queue.schedule(data as object | null);
            this.application.logger.debug("Queued", queue.id);
        }

        if (jobsToDelete.length) {
            await this.application.database.drizzle
                .delete(queuedJobs)
                .where(inArray(queuedJobs.id, jobsToDelete));
        }

        this.application.logger.info(`Synced ${jobs.length} queued jobs`);
    }

    public create<T extends object>(
        queue: string | QueueClass<T>,
        options: QueueCreateOptions
    ) {
        return this.queueManager.create(queue as QueueClass<T>, options);
    }

    public bulkCancel<T extends object>(
        type: QueueClass<T>,
        filter: (job: Job<T>) => boolean
    ) {
        return this.queueManager.bulkCancel<T>(type, filter);
    }
}

export default QueueManagerService;
