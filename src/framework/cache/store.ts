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
