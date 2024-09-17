/*
* This file is part of SudoBot.
*
* Copyright (C) 2021-2024 OSN Developers.
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

import { EventEmitter } from "node:events";
import { promiseWithResolvers } from "../polyfills/Promise";

type MutexOptions = {
    ignoreExtraneousUnlocks?: boolean;
};

enum MutexState {
    Locked,
    Unlocked
}

class Mutex<T extends MutexState = MutexState> extends EventEmitter {
    private _state: T = MutexState.Unlocked as T;
    private readonly ignoreExtraneousUnlocks: boolean;

    public constructor({ ignoreExtraneousUnlocks = true }: MutexOptions = {}) {
        super();
        this.ignoreExtraneousUnlocks = ignoreExtraneousUnlocks;
    }

    public async lock() {
        if (this.isLocked()) {
            const { promise, resolve } = promiseWithResolvers<void>();
            this.once("release", resolve);
            return promise;
        }

        this.setState(MutexState.Locked);
        return Promise.resolve();
    }

    public unlock() {
        if (!this.isLocked() && !this.ignoreExtraneousUnlocks) {
            throw new Error("This mutex is not locked yet.");
        }

        this.setState(MutexState.Unlocked);
        this.emit("release");
    }

    public isLocked(): this is Mutex<MutexState.Locked> {
        return this._state === MutexState.Locked;
    }

    public isUnlocked(): this is Mutex<MutexState.Unlocked> {
        return this._state === MutexState.Unlocked;
    }

    private setState<T extends MutexState>(state: T): Mutex<T> {
        this._state = state as unknown as typeof this._state;
        return this as unknown as Mutex<T>;
    }

    public get state(): T {
        return this._state;
    }
}

export default Mutex;
