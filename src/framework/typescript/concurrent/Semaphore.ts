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

import type Condition from "@framework/concurrent/Condition";
import { promiseWithResolvers } from "../polyfills/Promise";

type SemaphoreOptions = {
    ignoreExtraneousReleases?: boolean;
    maxPermits?: number;
    condition?: Condition;
};

class Semaphore {
    public static readonly EXTRANEOUS_RELEASE_ERROR_MESSAGE: string =
        'Semaphore count cannot be negative without the "ignoreExtraneousReleases" option set.\nThis is probably a bug in your code. Did you release too many times or too early before acquiring?';
    private readonly maxPermits: number;
    private count = 0;
    private readonly resolvers: Array<() => void> = [];
    private readonly ignoreExtraneousReleases: boolean;
    private readonly condition?: Condition;

    public constructor(options?: SemaphoreOptions);
    public constructor(maxPermits?: number);

    public constructor(optionsOrPermits: SemaphoreOptions | number = 1) {
        this.maxPermits =
            typeof optionsOrPermits === "number"
                ? optionsOrPermits
                : optionsOrPermits.maxPermits ?? 1;
        this.ignoreExtraneousReleases =
            typeof optionsOrPermits === "number"
                ? false
                : optionsOrPermits.ignoreExtraneousReleases ?? false;
        this.condition =
            typeof optionsOrPermits === "number" ? undefined : optionsOrPermits.condition;
    }

    public get availablePermits() {
        return this.maxPermits - this.count;
    }

    public async acquire() {
        if (this.condition) {
            await this.condition.wait();
        }

        if (this.count >= this.maxPermits) {
            const { promise, resolve } = promiseWithResolvers<void>();
            this.resolvers.push(resolve);
            this.count++;
            return promise;
        }

        this.count++;
        return Promise.resolve();
    }

    public release() {
        const resolver = this.resolvers.shift();

        if (resolver) {
            resolver();
        }

        this.count--;

        if (this.count < 0 && !this.ignoreExtraneousReleases) {
            throw new Error(Semaphore.EXTRANEOUS_RELEASE_ERROR_MESSAGE);
        }

        if (this.count < 0) {
            this.count = 0;
        }
    }
}

export default Semaphore;
