/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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

import { queues } from "@main/models/Queue";
import type { Snowflake } from "discord.js";
import { and, eq } from "drizzle-orm";
import type Application from "../app/Application";
import { HasApplication } from "../types/HasApplication";
import { isDevelopmentMode, requireNonNull } from "../utils/utils";
import type QueueManager from "./QueueManager";

export type StorableData = object | unknown[] | number | string | boolean | null;
export type QueueOptions<T extends StorableData> = {
    data: T;
    guildId: Snowflake;
    userId?: Snowflake;
    channelId?: Snowflake;
    messageId?: Snowflake;
    runsAt: Date;
    id?: number;
    createdAt?: Date | null;
    updatedAt?: Date | null;
    repeat?: boolean;
};

abstract class Queue<T extends StorableData = StorableData> extends HasApplication {
    public static readonly uniqueName: string = "";
    public readonly data: T;
    public readonly guildId: Snowflake;
    public readonly userId: Snowflake;
    public readonly channelId?: Snowflake;
    public readonly messageId?: Snowflake;
    public readonly runsAt: Date;
    public readonly repeat?: boolean;
    protected readonly manager: QueueManager;

    private _isExecuting: boolean = false;
    private _createdAt?: Date;
    private _updatedAt?: Date;
    private _id?: number;
    private _timeout?: Timer | number;

    public constructor(application: Application, manager: QueueManager, options: QueueOptions<T>) {
        super(application);

        if ("uniqueName" in this.constructor && this.constructor.uniqueName === "") {
            throw new Error("Queue must have a unique name");
        }

        this.data = options.data;
        this.manager = manager;
        this.guildId = options.guildId;
        this.userId = options.userId ?? application.getClient().user!.id;
        this.channelId = options.channelId;
        this.messageId = options.messageId;
        this.runsAt = options.runsAt;
        this.repeat = options.repeat;

        this._id = options.id;
        this._createdAt = options.createdAt ?? undefined;
        this._updatedAt = options.updatedAt ?? undefined;
    }

    public abstract execute(data: T): Promise<void>;

    public async run() {
        this._isExecuting = true;

        try {
            await this.execute(this.data);
        } catch (error) {
            this.application.logger.error(error);
        }

        this._isExecuting = false;

        if (!this.repeat) {
            await this.delete();
        }
    }

    public get isExecuting() {
        return this._isExecuting;
    }

    public get id() {
        return this._id;
    }

    public get isSaved() {
        return (
            this._id !== undefined && this._updatedAt !== undefined && this._createdAt !== undefined
        );
    }

    public get uniqueName() {
        return (this.constructor as typeof Queue).uniqueName;
    }

    public async save() {
        if (this._id !== undefined) {
            throw new Error("This queue has already been saved");
        }

        const [{ id, createdAt, updatedAt }] = await this.application.database.drizzle
            .insert(queues)
            .values({
                name: (this.constructor as typeof Queue).uniqueName,
                data: this.data,
                guildId: this.guildId,
                userId: this.userId,
                channelId: this.channelId,
                messageId: this.messageId,
                runsAt: this.runsAt,
                repeat: this.repeat
            })
            .returning();

        this._id = id;
        this._createdAt = createdAt ?? undefined;
        this._updatedAt = updatedAt ?? undefined;

        this.manager.add(this);

        return id;
    }

    public get createdAt() {
        return this._createdAt;
    }

    public get updatedAt() {
        return this._updatedAt;
    }

    public async delete() {
        requireNonNull(this._id, "Queue ID must be set to delete");

        this.application.logger.debug(
            "Delete result",
            await this.application.database.drizzle
                .delete(queues)
                .where(and(eq(queues.id, this._id!), eq(queues.guildId, this.guildId)))
        );

        this.manager.remove(this);
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
            if (isDevelopmentMode()) {
                throw new Error("Timeout not set");
            }

            return;
        }

        (this.repeat ? clearInterval : clearTimeout)(this._timeout);
    }

    
    public async schedule() {
        const id = await this.save();
        this.setTimeout();
        return id;
    }

    
    public cancel() {
        this.application.logger.debug(`Canceling queue: ${this._id}`);
        this.clearTimeout();
        return this.delete();
    }
}

export default Queue;
