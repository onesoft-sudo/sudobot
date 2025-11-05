import Application from "@framework/app/Application";

export const isDevelopmentMode = () => process.env.NODE_ENV === "development" || process.env.NODE_ENV === "dev";

export function escapeRegex(string: string) {
    return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&");
}

export function requireNonNull<T>(value: T | null | undefined, message?: string): T {
    if (value === null || value === undefined) {
        throw new Error(message ?? "Value cannot be null or undefined");
    }

    return value;
}

export const notIn = <T extends object>(obj: T, key: keyof T): boolean => !(key in obj);

export const letValue = <T>(value: T, fn: (value: T) => T): T => {
    return fn(value);
};

export const also = <T>(value: T, fn: (value: T) => void): T => {
    fn(value);
    return value;
};

export function isSnowflake(input: string) {
    return /^\d{16,22}$/.test(input);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function noOperation(..._args: any[]): void {
    return;
}

export function suppressErrorNoReturn(value: unknown): void {
    if (value instanceof Promise) {
        value.catch(Application.current().logger.error);
    }
}

export function sourceFile(moduleName: string): string {
    if (process.isBun) {
        return `${moduleName}.ts`;
    }

    return `${moduleName}.js`;
}
