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
import type Job from "@framework/queues/Job";
import type JobDescriptor from "@framework/queues/JobDescriptor";
import type QueueManager from "@framework/queues/QueueManager";

abstract class JobDatabaseDriver {
    protected readonly application: Application;
    protected readonly queueManager: QueueManager;

    public constructor(application: Application, queueManager: QueueManager) {
        this.application = application;
        this.queueManager = queueManager;
    }

    public abstract create(
        job: Omit<Job<object>, "id">
    ): Promise<JobDescriptor>;
    public abstract remove(job: Job<object>): Promise<boolean>;
    public abstract getAll(): Promise<Iterable<JobDescriptor>>;
}

export default JobDatabaseDriver;
