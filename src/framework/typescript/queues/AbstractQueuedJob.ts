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
