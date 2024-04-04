import { HasApplication } from "../types/HasApplication";
import Queue, { QueueOptions, StorableData } from "./Queue";

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

        return new QueueClass(this.application, options);
    }

    public async bulkCancel<T extends StorableData>(type: QueueClass<T>, filter: (queue: Queue<NoInfer<T>>) => boolean) {
        for (const queue of this.scheduledQueues.values()) {
            // noinspection SuspiciousTypeOfGuard
            if (queue instanceof type && filter(queue as Queue<NoInfer<T>>)) {
                await queue.cancel();
            }
        }
    }
}

export default QueueManager;
