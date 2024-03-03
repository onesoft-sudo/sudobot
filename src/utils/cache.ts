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
