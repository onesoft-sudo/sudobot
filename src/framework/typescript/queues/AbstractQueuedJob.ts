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
import type JobState from "@framework/queues/JobState";
import type QueueManager from "@framework/queues/QueueManager";
import type { Awaitable } from "discord.js";

abstract class AbstractQueuedJob<T extends object> {
    protected readonly application: Application;
    protected readonly queueManager: QueueManager;

    public constructor(application: Application, queueManager: QueueManager) {
        this.application = application;
        this.queueManager = queueManager;
    }

    public abstract execute(data: T | null): Awaitable<JobState>;

    public get name() {
        return this.constructor.name;
    }

    public onAppBoot?(): Awaitable<void>;
}

export type QueueClass<T extends object = object> = new (
    application: Application,
    manager: QueueManager
) => AbstractQueuedJob<T>;

export default AbstractQueuedJob;
