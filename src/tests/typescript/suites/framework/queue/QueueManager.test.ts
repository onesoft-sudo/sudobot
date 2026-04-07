/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025 OSN Developers.
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

import Application from "@framework/app/Application";
import AbstractQueuedJob from "@framework/queues/AbstractQueuedJob";
import Job from "@framework/queues/Job";
import JobDatabaseDriver from "@framework/queues/JobDatabaseDriver";
import JobDescriptor from "@framework/queues/JobDescriptor";
import JobState from "@framework/queues/JobState";
import QueueManager from "@framework/queues/QueueManager";
import { BeforeEach, TestCase } from "@tests/core/Test";
import { TestSuite } from "@tests/core/TestSuite";
import { Collection } from "discord.js";
import { setTimeout } from "timers/promises";
import { TestContext } from "vitest";

class DummyJobDatabaseDriver extends JobDatabaseDriver {
    private readonly descriptors = new Collection<number, JobDescriptor>();

    public override create(
        job: Omit<Job<object>, "id">
    ): Promise<JobDescriptor> {
        const descriptor = {
            id: Math.round(Math.random() * 10000),
            channelId: job.channelId,
            guildId: job.guildId,
            messageId: job.messageId,
            userId: job.userId,
            runsAtTimestamp: job.runsAt.getTime(),
            createdAtTimestamp: job.createdAt.getTime(),
            data: job.data,
            name: job.handlerId
        };

        this.descriptors.set(descriptor.id, descriptor);
        return Promise.resolve(descriptor);
    }

    public override remove(job: Job<object>): Promise<boolean> {
        return Promise.resolve(this.descriptors.delete(job.id));
    }

    public override getAll(): Promise<Iterable<JobDescriptor>> {
        return Promise.resolve(this.descriptors.values());
    }
}

@TestSuite
class QueueManagerTest {
    private application!: Application;

    @BeforeEach
    public initialize() {
        this.application = new Application({
            projectRootDirectoryPath: "",
            rootDirectoryPath: "",
            version: "1"
        });
    }

    @TestCase
    public async itCanQueueJobs({ expect }: TestContext) {
        const manager = new QueueManager(
            this.application,
            DummyJobDatabaseDriver
        );

        let executed = false;

        class TestQueue extends AbstractQueuedJob<{
            name: string;
            age: number;
        }> {
            public override async execute(
                data: { name: string; age: number } | null
            ): Promise<JobState> {
                await Promise.resolve();
                executed = data?.age === 20 && data?.name === "Test";
                return JobState.Success;
            }
        }

        manager.register(new TestQueue(this.application, manager));

        const runsAt = new Date(Date.now() + 2000);

        const job = manager.create(TestQueue, {
            runsAt
        });

        expect(job).toBeInstanceOf(Job);
        expect(job.runsAt).toStrictEqual(runsAt);

        await job.schedule({
            age: 20,
            name: "Test"
        });

        expect(job.data).toStrictEqual({
            age: 20,
            name: "Test"
        });

        await setTimeout(1000);
        expect(executed).toBe(false);
        await setTimeout(2500);
        expect(executed).toBe(true);
    }
}

export default QueueManagerTest;
