/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
 *
 * SudoBot is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SudoBot is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
 */

import Application from "@framework/app/Application";

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

export function isDevelopmentMode() {
    return (
        process.env.NODE_ENV === "development" ||
        process.env.NODE_ENV === "dev" ||
        process.env.SUDO_ENV === "dev"
    );
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
