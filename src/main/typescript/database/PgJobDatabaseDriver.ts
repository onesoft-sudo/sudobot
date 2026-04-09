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

import type Job from "@framework/queues/Job";
import JobDatabaseDriver from "@framework/queues/JobDatabaseDriver";
import type JobDescriptor from "@framework/queues/JobDescriptor";
import type Application from "@main/core/Application";
import { queuedJobs } from "@main/models/QueuedJob";
import { eq } from "drizzle-orm";

class PgJobDatabaseDriver extends JobDatabaseDriver {
    declare protected application: Application;

    protected get database() {
        return this.application.database;
    }

    public override async create(
        job: Omit<Job<object>, "id">
    ): Promise<JobDescriptor> {
        const result = (
            await this.database.drizzle
                .insert(queuedJobs)
                .values({
                    name: job.handlerId,
                    channelId: job.channelId,
                    userId: job.userId,
                    messageId: job.messageId,
                    guildId: job.guildId,
                    createdAt: job.createdAt,
                    data: job.data,
                    repeat: job.repeat,
                    runsAt: job.runsAt
                })
                .returning()
        )[0];

        if (!result) {
            throw new Error("No rows inserted");
        }

        return {
            channelId: result.channelId,
            createdAtTimestamp: result.createdAt.getTime(),
            data: result.data as object,
            guildId: result.guildId,
            id: result.id,
            messageId: result.messageId,
            name: result.name,
            runsAtTimestamp: result.runsAt.getTime(),
            userId: result.userId
        };
    }

    public override async getAll(): Promise<Iterable<JobDescriptor>> {
        return (await this.database.query.queuedJobs.findMany()).map(job => ({
            channelId: job.channelId,
            createdAtTimestamp: job.createdAt.getTime(),
            data: job.data as object,
            guildId: job.guildId,
            id: job.id,
            messageId: job.messageId,
            name: job.name,
            runsAtTimestamp: job.runsAt.getTime(),
            userId: job.userId
        }));
    }

    public override async remove(job: Job<object>): Promise<boolean> {
        const { rowCount } = await this.database.drizzle
            .delete(queuedJobs)
            .where(eq(queuedJobs.id, job.id));

        return (rowCount ?? 0) >= 1;
    }
}

export default PgJobDatabaseDriver;
