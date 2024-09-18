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

const data = new Map<string, CacheData>();

export type CacheOptions<T extends boolean = false> = {
    ttl?: number;
    invoke?: T;
    onHit?: () => void;
};

type CacheData<T = unknown> = {
    value: T;
    timeout?: Timer;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any) => any;
type ReturnValue<I extends boolean, F extends AnyFunction> = I extends true ? ReturnType<F> : F;

export const cache = <F extends AnyFunction, I extends boolean = false>(
    id: string | number,
    fn: F,
    options?: CacheOptions<I>
): ReturnValue<I, F> => {
    const callback = ((...args: unknown[]): unknown => {
        const finalId = [...args, id].join("_");

        if (!data.has(finalId)) {
            const cacheData: CacheData = {
                value: fn(...args)
            };

            if (options?.ttl) {
                cacheData.timeout = setTimeout(() => {
                    data.delete(finalId);
                }, options.ttl);
            }

            data.set(finalId, cacheData);
            options?.onHit?.();
        }

        return data.get(finalId)?.value;
    }) as unknown as F;

    if (options?.invoke) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return callback() as ReturnValue<I, F>;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return callback as ReturnValue<I, F>;
};

export const resetCache = () => {
    data.forEach(entry => entry.timeout && clearTimeout(entry.timeout));
    data.clear();
};

export const memoize = <F extends AnyFunction>(fn: F) => {
    const cache = new Map<string, ReturnType<F>>();

    return (...args: Parameters<F>): ReturnType<F> => {
        const key = args.join("_");
        if (cache.has(key)) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return cache.get(key)!;
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return fn(...(args as unknown[]));
    };
};
