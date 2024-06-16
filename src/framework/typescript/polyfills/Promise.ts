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
