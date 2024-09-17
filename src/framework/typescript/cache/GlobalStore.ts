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

import type { Awaitable } from "discord.js";
import { Collection } from "discord.js";
import { isDeepStrictEqual } from "util";
import Application from "../app/Application";

declare global {
    interface FrameworkCacheStore extends Record<string, unknown> {}
}

type CacheKey = Extract<keyof FrameworkCacheStore, string>;
type CacheValue<K extends CacheKey> = FrameworkCacheStore[K];
type CacheData<K extends CacheKey> = {
    key: K;
    value: CacheValue<K>;
    ttl?: number;
    hits?: number;
    maxHits?: number;
    timeout?: Timer;
    dependencies?: Array<Dependency>;
};
type CacheOptions = {
    ttl?: number;
    maxHits?: number;
    dependencies?: Array<Dependency>;
    dependencyCheckDeep?: boolean;
};

type Dependency = string | number | boolean | undefined | null | object;

const store = new Collection<CacheKey, CacheData<CacheKey>>();

export const get = <K extends CacheKey>(key: K): CacheValue<K> | undefined => {
    const data = store.get(key);

    if (!data) {
        return undefined;
    }

    if (data.hits !== undefined && data.maxHits !== undefined && ++data.hits >= data.maxHits) {
        store.delete(key);
    }

    return data.value;
};

export const set = async <K extends CacheKey>(
    key: K,
    value: CacheValue<K> | (() => Awaitable<CacheValue<K>>),
    options?: CacheOptions
): Promise<boolean> => {
    const existing = store.get(key);
    let change = false;

    if (existing) {
        if (options?.dependencies !== undefined) {
            if (existing.dependencies === undefined) {
                change = true;
            } else if (existing.dependencies.length !== options.dependencies.length) {
                change = true;
            } else {
                if (!options?.dependencyCheckDeep) {
                    for (const index in options.dependencies) {
                        if (existing.dependencies![index] !== options.dependencies[index]) {
                            change = true;
                            break;
                        }
                    }
                } else {
                    change = !isDeepStrictEqual(existing.dependencies!, options.dependencies!);
                }
            }
        } else {
            change = true;
        }
    } else {
        change = true;
    }

    if (change) {
        Application.current().logger.debug(`Cache: MISS ${key}`);

        store.delete(key);
        store.set(key, {
            key,
            value: typeof value === "function" ? await value() : value,
            maxHits: options?.maxHits,
            ttl: options?.ttl,
            timeout: options?.ttl
                ? setTimeout(() => {
                      Application.current().logger.debug(`Cache: EXPIRED ${key}`);
                      store.delete(key);
                  }, options.ttl)
                : undefined,
            dependencies: options?.dependencies,
            hits: options?.maxHits ? 0 : undefined
        });

        return false;
    } else {
        Application.current().logger.debug(`Cache: HIT ${key}`);
        return true;
    }
};

export const withDeps = async <K extends CacheKey, F extends () => Awaitable<CacheValue<K>>>(
    key: K,
    value: F,
    dependencies: Array<Dependency>,
    options?: CacheOptions
): Promise<Awaited<ReturnType<F>>> => {
    await set(key, value, {
        ...options,
        maxHits: options?.maxHits ? options.maxHits + 1 : undefined,
        dependencyCheckDeep: options?.dependencyCheckDeep ?? true,
        dependencies
    });
    return get(key) as Promise<Awaited<ReturnType<F>>>;
};

export const has = <K extends CacheKey>(key: K): boolean => {
    return store.has(key);
};

export const hits = <K extends CacheKey>(key: K): number | undefined => {
    return store.get(key)?.hits;
};

export const clear = () => store.clear();
