import path from "path";
import Queue, { QueueConstructorOptions } from "./Queue";
import { log, logError } from "./logger";

export default class QueueEntry {
    timeout: NodeJS.Timeout | undefined = undefined;
    public id: number = 0;
    public readonly creatingRecord: Promise<void> | undefined;

    constructor(public readonly options: QueueConstructorOptions) {
        if (options.id)
            this.id = options.id;
        else
            this.creatingRecord = this.createDatabaseRecord().catch(logError);

        log(options.filePath);
    }

    private async createDatabaseRecord() {
        const { id } = await this.options.client.prisma.queue.create({
            data: {
                channel_id: this.options.channelId,
                file_name: path.basename(this.options.filePath),
                guild_id: this.options.guild.id,
                message_id: this.options.messageId,
                user_id: this.options.userId,
                willRunAt: this.options.willRunAt,
                args: this.options.args,
                name: this.options.name
            }
        });

        this.id = id;
    }

    private async deleteDatabaseRecord() {
        log("Deleting", this.id);

        await this.options.client.prisma.queue.delete({
            where: {
                id: this.id
            }
        });

        log("Deleted");
    }

    async run(): Promise<any> {
        try {
            log("Running queue: ", this.options.filePath);
            const { default: QueueClass }: { default: new (options: QueueConstructorOptions) => Queue } = await import(this.options.filePath);
            const queue = new QueueClass(this.options);
            await queue.run(...this.options.args);
        }
        catch (e) {
            logError(e);
            logError("Error occurred during running the queue.");
        }

        this.options.client.queueManager.queues.delete(this.id.toString());
    }

    setTimeout() {
        log("Queue timeout set: ", path.basename(this.options.filePath));

        this.timeout = setTimeout(() => {
            this.run().catch(console.error);
            this.deleteDatabaseRecord().catch(console.error);
        }, this.options.willRunAt.getTime() - Date.now());
    }

    clearTimeout() {
        log(this.timeout);

        if (this.timeout === undefined)
            return;

        log("Queue timeout cleared: ", path.basename(this.options.filePath));

        clearTimeout(this.timeout);
        this.timeout = undefined;
        return this.deleteDatabaseRecord();
    }
}