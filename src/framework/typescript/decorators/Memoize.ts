import type { AnyFunction } from "@framework/types/Utils";

export function Memoize<T extends object>(
    target: T,
    propertyKey: {
        [K in keyof T]: T[K] extends AnyFunction ? K : never;
    }[keyof T],
    context?: TypedPropertyDescriptor<AnyFunction>
) {
    if (!context) {
        return;
    }

    const current = target[propertyKey] as AnyFunction;
    let memoizedValue: unknown;
    let memoized = false;

    context.value = (...args: never[]) => {
        if (!memoized) {
            memoizedValue = current.call(target, ...args);
        }

        memoized = true;
        return memoizedValue;
    };
}
