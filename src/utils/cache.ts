/*
* This file is part of SudoBot.
*
* Copyright (C) 2021-2023 OSN Developers.
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

const data = new WeakMap<unknown[], unknown>();

export type CacheOptions<T extends boolean = true> = {
    ttl: number;
    invoke: T;
};

type AnyFunction = (...args: any[]) => any;
type ReturnValue<I extends boolean, F extends AnyFunction> = I extends true ? ReturnType<F> : F;

export const cache = <F extends AnyFunction, I extends boolean>(
    id: string | number,
    fn: F,
    options?: CacheOptions<I>
): ReturnValue<I, F> => {
    const callback = ((...args: any[]) => {
        const finalId = [...args, id];

        if (!data.has(finalId)) {
            if (options?.ttl) {
                setTimeout(() => {
                    data.delete(finalId);
                }, options.ttl);
            }

            data.set(finalId, fn(...args));
        }

        return data.get(finalId);
    }) as unknown as F;

    if (options?.invoke) {
        return callback() as ReturnValue<I, F>;
    }

    return callback as ReturnValue<I, F>;
};
