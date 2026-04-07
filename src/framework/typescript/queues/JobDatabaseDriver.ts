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
