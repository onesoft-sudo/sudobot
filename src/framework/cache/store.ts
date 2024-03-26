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

import { Collection } from "discord.js";

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
};
type CacheOptions = {
    ttl?: number;
    maxHits?: number;
};

const store = new Collection<CacheKey, CacheData<CacheKey>>();

export const get = <K extends CacheKey>(key: K): CacheValue<K> | undefined => {
    const data = store.get(key);

    if (!data) {
        return undefined;
    }

    if (data.hits && data.maxHits && ++data.hits > data.maxHits) {
        store.delete(key);
    }

    return data.value;
};

export const set = <K extends CacheKey>(
    key: K,
    value: CacheValue<K>,
    options?: CacheOptions
): void => {
    store.set(key, {
        key,
        value,
        maxHits: options?.maxHits,
        ttl: options?.ttl,
        timeout: options?.ttl ? setTimeout(() => store.delete(key), options.ttl) : undefined
    });
};

export const has = <K extends CacheKey>(key: K): boolean => {
    return store.has(key);
};

export const hits = <K extends CacheKey>(key: K): number | undefined => {
    return store.get(key)?.hits;
};

export const clear = () => store.clear();
