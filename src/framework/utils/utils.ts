export function requireNonNull<T>(value: T | null | undefined, message?: string): T {
    if (value === null || value === undefined) {
        throw new Error(message ?? "Value cannot be null or undefined");
    }

    return value;
}
