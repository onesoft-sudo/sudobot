export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const shallowCopy = { ...obj };

    for (const key of keys) {
        delete shallowCopy[key];
    }

    return shallowCopy;
}

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const shallowCopy = {} as Pick<T, K>;

    for (const key of keys) {
        shallowCopy[key] = obj[key];
    }

    return shallowCopy;
}
