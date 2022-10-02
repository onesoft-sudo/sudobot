import { Collection } from "discord.js";
import DiscordClient from "../client/Client";
import QueuedJob from "../models/QueuedJob";
import Queue, { QueueOptions } from "../utils/structures/Queue";
import Service from "../utils/structures/Service";
import { v4 as uuid } from "uuid";
import path from "path";

export type QueueCreateOptions = {
    data?: { [key: string | number]: any };
    runAt?: Date;
    runAfter?: number;
};

export default class QueueManager extends Service {
    protected readonly queues: Collection<string, Queue> = new Collection();

    async loadQueues() {
        const models = await QueuedJob.find();

        for await (const model of models) {
            const { default: Queue }: { default: new (client: DiscordClient, queueOptions: QueueOptions) => Queue } = await import(path.resolve(__dirname, '../queues/', model.className));
            console.log(Queue);
            this.queues.set(model.uuid, new Queue(this.client, { model, id: model.uuid, runAt: new Date(model.runOn) }));
            console.log("Found queue: ", model.className);
        }
    }

    setQueue(queue: Queue) {
        this.queues.set(queue.id, queue);
    }

    cancelQueue(id: string) {
        return this.queues.get(id)?.cancel();
    }

    async addQueue(queueClass: new (client: DiscordClient, queueOptions: QueueOptions) => Queue, { data, runAt, runAfter }: QueueCreateOptions) {
        if (runAfter !== 0 && runAfter !== 0 && !runAfter && !runAt) {
            throw new Error("One of runAfter or runAt must be specified for creating a queue");
        }

        const id = uuid();
        const model = await QueuedJob.create({ uuid: id, data, runOn: runAfter ? Date.now() + runAfter : runAt!.getTime(), createdAt: new Date(), className: queueClass.name });
        const queue = new queueClass(this.client, { model, id, runAt, runAfter });
        this.setQueue(queue);
    }

    runQueue(id: string) {
        return this.queues.get(id)?.run();
    }

    removeQueue(queue: Queue) {
        const { id } = queue;
        this.queues.delete(id);
    }
}   