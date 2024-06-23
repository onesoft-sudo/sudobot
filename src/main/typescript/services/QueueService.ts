import Queue, { QueueOptions, StorableData } from "@framework/queues/Queue";
import QueueManager, { QueueClass } from "@framework/queues/QueueManager";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { queues } from "@main/models/Queue";
import { isNotNull } from "drizzle-orm";
import { HasEventListeners } from "../types/HasEventListeners";

@Name("queueService")
class QueueService extends Service implements HasEventListeners {
    protected readonly queueManager = new QueueManager(this.application);

    public async onReady() {
        await this.sync();
    }

    public onBeforeQueueRegister() {
        this.queueManager.clearRegisteredQueues();
    }

    public register(queue: QueueClass, name?: string): void {
        this.queueManager.register(queue, name);
    }

    public getJobs() {
        return this.queueManager.getJobs();
    }

    public getJob(id: number) {
        return this.queueManager.getJob(id);
    }

    public async sync(): Promise<void> {
        const queuedJobs = await this.application.database.query.queues.findMany({
            where: (isNotNull(queues.runsAt))
        });

        for (const queueInfo of queuedJobs) {
            const {
                name,
                runsAt,
                channelId,
                createdAt,
                data,
                guildId,
                id,
                messageId,
                updatedAt,
                userId
            } = queueInfo;

            if (!runsAt) {
                continue;
            }

            const queue = this.queueManager.create(name, {
                data: data as StorableData,
                guildId,
                userId,
                channelId: channelId ?? undefined,
                messageId: messageId ?? undefined,
                runsAt,
                id,
                createdAt,
                updatedAt
            });

            this.application.logger.debug(queue.id);

            if (runsAt.getTime() <= Date.now()) {
                queue.run().catch(this.application.logger.error);
                this.application.logger.debug("Immediate run", queue.id);
                continue;
            }

            queue.setTimeout();
            this.queueManager.add(queue);
            this.application.logger.debug("Queued", queue.id);
        }

        this.application.logger.info(`Synced ${queuedJobs.length} queued jobs`);
    }

    public create<T extends StorableData>(
        queue: string | QueueClass<T>,
        options: QueueOptions<NoInfer<T>>
    ): Queue<T> {
        return this.queueManager.create(queue, options);
    }

    public bulkCancel<T extends StorableData>(
        type: QueueClass<T>,
        filter: (queue: Queue<NoInfer<T>>) => boolean
    ) {
        return this.queueManager.bulkCancel(type, filter);
    }
}

export default QueueService;
