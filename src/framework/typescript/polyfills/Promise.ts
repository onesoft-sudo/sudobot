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

import assert from "assert";

export type PromiseWithResolversReturn<T> = {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (reason?: unknown) => void;
};

export function promiseWithResolvers<T>(): PromiseWithResolversReturn<T> {
    if (typeof Promise.withResolvers !== "undefined") {
        return Promise.withResolvers<T>();
    }

    let resolve: ((value: T) => void) | undefined;
    let reject: ((reason?: unknown) => void) | undefined;

    const promise = new Promise<T>((promiseResolve, promiseReject) => {
        resolve = promiseResolve;
        reject = promiseReject;
    });

    assert(resolve !== undefined);
    assert(reject !== undefined);

    return { promise, resolve, reject };
}
