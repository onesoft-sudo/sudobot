import type { AnyFunction } from "@framework/types/Utils";

export function Memoize<T extends object>(target: T, propertyKey: PropertyKey, context?: PropertyDescriptor) {
    if (!context) {
        return;
    }

    const current = target[propertyKey as keyof T] as AnyFunction;
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
