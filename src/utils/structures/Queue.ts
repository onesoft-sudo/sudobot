/**
* This file is part of SudoBot.
* 
* Copyright (C) 2021-2022 OSN Inc.
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

import DiscordClient from "../../client/Client";
import { generate as randomstring } from 'randomstring';
import { IQueuedJob } from "../../models/QueuedJob";

export interface QueueOptions {
    runAfter?: number;
    id?: string;
    runAt?: Date;
    model: IQueuedJob;
}

export default abstract class Queue {
    protected completed = false;
    public readonly runOn: number = 0;
    public readonly id: string;
    public readonly model: IQueuedJob;
    protected readonly timeout: NodeJS.Timeout;
    public readonly guild: string | undefined;

    constructor(protected client: DiscordClient, { runAfter, id, runAt, model }: QueueOptions) {
        if (runAfter !== 0 && runAfter !== 0 && !runAfter && !runAt) {
            throw new Error("One of runAfter or runAt must be specified for creating a queue");
        }

        this.runOn = runAfter ? Date.now() + runAfter : runAt!.getTime();
        this.id = id ?? randomstring(7);
        this.model = model;
        this.guild = model.guild;

        const ms = this.runOn - Date.now();

        this.timeout = setTimeout(async () => {
            await this.run();
            await this.finish();
        }, ms < 0 ? 0 : ms);

        console.log('Queue created: ', this.constructor.name, this.id);
    }

    get data() {
        return this.model.data;
    }

    async finish() {
        this.client.queueManager.removeQueue(this);
        console.log("Job complete: ", this.constructor.name);
    }

    async cancel() {
        clearTimeout(this.timeout);
        await this.model.delete();
        this.client.queueManager.removeQueue(this);
    }

    abstract execute(data?: { [key: string | number]: any }): Promise<any>;

    async run() {
        this.completed = true;
        this.model.delete();

        try {
            return await this.execute(this.model.data);
        }
        catch (e) {
            console.error(`An error occurred in queue job\nJob ID: ${this.id}`, e);
        }
    }
}