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
    const callback = ((...args: unknown[]) => {
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
        return callback() as ReturnValue<I, F>;
    }

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
            return cache.get(key)!;
        }

        return fn(...args);
    };
};
