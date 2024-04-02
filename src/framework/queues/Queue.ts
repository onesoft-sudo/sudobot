import { Prisma } from "@prisma/client";
import { Snowflake } from "discord.js";
import Application from "../app/Application";
import { HasApplication } from "../types/HasApplication";
import { requireNonNull } from "../utils/utils";

export type StorableData = Prisma.InputJsonValue | typeof Prisma.JsonNull;
export type QueueOptions<T extends StorableData> = {
    data: T;
    guildId: Snowflake;
    userId?: Snowflake;
    channelId?: Snowflake;
    messageId?: Snowflake;
    runsAt: Date;
    id?: number;
    createdAt?: Date;
    updatedAt?: Date;
    repeat?: boolean;
};

abstract class Queue<T extends StorableData = StorableData> extends HasApplication {
    public static readonly uniqueName: string = "";
    protected readonly data: T;
    protected readonly guildId: Snowflake;
    protected readonly userId: Snowflake;
    protected readonly channelId?: Snowflake;
    protected readonly messageId?: Snowflake;
    protected readonly runsAt: Date;
    protected readonly repeat?: boolean;

    private _createdAt?: Date;
    private _updatedAt?: Date;
    private _id?: number;
    private _timeout?: Timer | number;

    public constructor(application: Application, options: QueueOptions<T>) {
        super(application);

        if ("uniqueName" in this.constructor && this.constructor.uniqueName === "") {
            throw new Error("Queue must have a unique name");
        }

        this.data = options.data;
        this.guildId = options.guildId;
        this.userId = options.userId ?? this.application.getClient().user!.id;
        this.channelId = options.channelId;
        this.messageId = options.messageId;
        this.runsAt = options.runsAt;
        this.repeat = options.repeat;

        this._id = options.id;
        this._createdAt = options.createdAt;
        this._updatedAt = options.updatedAt;
    }

    public abstract execute(data: T): Promise<void>;

    public async run() {
        try {
            await this.execute(this.data);
        } catch (error) {
            this.application.logger.error(error);
        }

        if (!this.repeat) {
            await this.delete();
        }
    }

    public get id() {
        return this._id;
    }

    public get isSaved() {
        return (
            this._id !== undefined && this._updatedAt !== undefined && this._createdAt !== undefined
        );
    }

    public async save() {
        if (this._id !== undefined) {
            throw new Error("This queue has already been saved");
        }

        const { id, createdAt, updatedAt } = await this.application.prisma.queue.create({
            data: {
                name: (this.constructor as typeof Queue).uniqueName,
                data: this.data,
                guildId: this.guildId,
                userId: this.userId,
                channelId: this.channelId,
                messageId: this.messageId,
                runsAt: this.runsAt,
                repeat: this.repeat
            }
        });

        this._id = id;
        this._createdAt = createdAt;
        this._updatedAt = updatedAt;

        return id;
    }

    public async delete() {
        requireNonNull(this._id, "Queue ID must be set to delete");

        await this.application.prisma.queue.delete({
            where: {
                id: this._id,
                guildId: this.guildId
            }
        });
    }

    public setTimeout() {
        const timeout = this.runsAt.getTime() - Date.now();

        if (timeout < 0) {
            throw new Error("Timeout delay must be greater than 0");
        }

        this._timeout = (this.repeat ? setInterval : setTimeout)(
            () => this.run().catch(this.application.logger.error),
            timeout
        );
    }

    public clearTimeout() {
        if (!this._timeout) {
            throw new Error("Timeout not set");
        }

        (this.repeat ? clearInterval : clearTimeout)(this._timeout);
    }

    public async schedule() {
        const id = await this.save();
        this.setTimeout();
        return id;
    }

    public cancel() {
        this.clearTimeout();
        return this.delete();
    }
}

export default Queue;
