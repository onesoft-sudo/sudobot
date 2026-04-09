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

import JobState from "@framework/queues/JobState";
import type QueueManager from "@framework/queues/QueueManager";

class Job<T extends object> {
    public readonly createdAt: Date;
    public readonly runsAt: Date;
    public readonly handlerId: string;
    public readonly manager: QueueManager;
    public readonly guildId: string | null = null;
    public readonly userId: string | null = null;
    public readonly channelId: string | null = null;
    public readonly messageId: string | null = null;
    public readonly repeat: boolean = false;

    protected _id: number = -1;
    protected _data: T | null = null;
    protected _state: JobState = JobState.Pending;
    protected _timeout: Timer | null = null;

    public constructor(
        manager: QueueManager,
        id: number = -1,
        createdAt: Date,
        runsAt: Date | number,
        handlerId: string,
        guildId: string | null,
        userId: string | null,
        channelId: string | null,
        messageId: string | null,
        repeat: boolean
    ) {
        if (id >= 0) this._id = id;

        this.manager = manager;
        this.createdAt = createdAt;
        this.runsAt =
            typeof runsAt === "number" ? new Date(Date.now() + runsAt) : runsAt;
        this.handlerId = handlerId;
        this.guildId = guildId;
        this.userId = userId;
        this.channelId = channelId;
        this.messageId = messageId;
        this.repeat = repeat;
    }

    public get id() {
        return this._id;
    }

    public get state() {
        return this._state;
    }

    public get data(): Readonly<T> | null {
        return this._data;
    }

    public async schedule(data: T | null = null) {
        if (this._timeout) {
            return false;
        }

        this._data = data;
        const { id } = await this.manager.driver.create(this);
        this._id = id;

        const remaining = this.runsAt.getTime() - Date.now();
        const callback = async () => {
            this._timeout = null;
            this._state = JobState.Executing;
            this._state = await this.manager.executeJob<T>(
                this,
                this.handlerId,
                this.data
            );

            await this.manager.driver.remove(this);

            if (this.repeat) {
                setImmediate(async () => {
                    await this.manager
                        .create<object>(this.handlerId, {
                            runsAt: new Date(
                                this.runsAt.getTime() - this.createdAt.getTime()
                            ),
                            channelId: this.channelId ?? undefined,
                            guildId: this.guildId ?? undefined,
                            messageId: this.messageId ?? undefined,
                            userId: this.userId ?? undefined,
                            repeat: this.repeat
                        })
                        .schedule(this.data);
                });
            }
        };

        this._timeout = setTimeout(callback, Math.max(remaining, 1));
        this.manager.scheduledJobs.set(this.id, this);
        return true;
    }

    public async immediateRun(data: T | null = null) {
        if (this._timeout) {
            clearTimeout(this._timeout);
            this._timeout = null;
        }

        this._data = data;
        this._state = JobState.Executing;
        this._state = await this.manager.executeJob<T>(
            this,
            this.handlerId,
            this.data
        );

        await this.manager.driver.remove(this);
    }

    public async cancel() {
        if (this._timeout) {
            this._state = JobState.Canceled;
            clearTimeout(this._timeout);
            this._timeout = null;
            this.manager.scheduledJobs.delete(this.id);
            await this.manager.driver.remove(this);
            return true;
        }

        return false;
    }
}

export default Job;
