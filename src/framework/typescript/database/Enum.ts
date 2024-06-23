import { pgEnum as drizzlePgEnum } from "drizzle-orm/pg-core";

export function enumToPgEnum<T extends Record<string, string>>(target: T) {
    return Object.values(target).map((value: unknown) => `${value}`) as [
        T[keyof T],
        ...T[keyof T][]
    ];
}

export function pgEnum<T extends Record<string, string>>(name: string, target: T) {
    return drizzlePgEnum(name, enumToPgEnum<T>(target));
}
