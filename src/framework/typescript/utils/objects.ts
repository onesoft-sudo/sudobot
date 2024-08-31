/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2024 OSN Developers.
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

import assert from "assert";

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

type AccessOptions = {
    create?: boolean;
    modify?: boolean;
    arrayAccess?: boolean;
    returnExists?: boolean;
};

const access = (
    object: object | unknown[],
    accessor: string,
    setter?: (value: unknown) => unknown,
    options: AccessOptions = {
        create: true,
        modify: true,
        arrayAccess: false,
        returnExists: false
    }
) => {
    if (typeof accessor !== "string" || !accessor.length) {
        throw new Error("Accessor must be a non-empty string");
    }

    const accessors = accessor.split(".");
    let current: unknown = object;
    let prevAccessor: string | undefined;

    if (accessors.length === 0 || !accessor) {
        return object;
    }

    for (const access of accessors) {
        const last = access === accessors[accessors.length - 1];

        if (current instanceof Object) {
            if (options.arrayAccess && /\[\d+\]$/.test(access)) {
                const array = current[
                    access.slice(0, access.indexOf("[")) as keyof typeof current
                ] as unknown as Array<unknown>;

                if (!Array.isArray(array)) {
                    throw new Error(
                        `Cannot access index ${access} of non-array value (${prevAccessor ?? "root"})`
                    );
                }

                const index = parseInt(access.match(/\d+/)![0]);

                if (Number.isNaN(index)) {
                    throw new Error(`Invalid index ${index} (${prevAccessor ?? "root"})`);
                }

                current = array[index];

                if (options.returnExists && last) {
                    return index in array;
                }

                setArray: if (setter && last) {
                    if (!options.modify && index in array && !options.create && !(index in array)) {
                        break setArray;
                    }

                    array[index] = setter(current);
                }
            } else {
                if (Array.isArray(current)) {
                    return options?.returnExists ? false : undefined;
                }

                let value = current[access as keyof typeof current];

                if (options?.returnExists && last) {
                    return access in current;
                }

                if (!(access in current) && options.create) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    current[access as keyof typeof current] = {} as any;
                    value = current[access as keyof typeof current];
                }

                setObject: if (setter && last) {
                    if (
                        !options.modify &&
                        access in current &&
                        !options.create &&
                        !(access in current)
                    ) {
                        break setObject;
                    }

                    (current as Record<PropertyKey, unknown>)[access as PropertyKey] =
                        setter(current);
                }

                current = value;
            }
        } else {
            if (last) {
                return options.returnExists ? false : undefined;
            }

            return setter ? current : undefined;
        }
    }

    return options?.returnExists ? true : current;
};

export const get = <V = unknown>(
    object: object | unknown[],
    accessor: string,
    options: AccessOptions = {
        create: false,
        modify: false,
        arrayAccess: false,
        returnExists: false
    }
) => access(object, accessor, undefined, options) as V;
export const has = (
    object: object | unknown[],
    accessor: string,
    options: AccessOptions = {
        create: false,
        modify: false,
        arrayAccess: false,
        returnExists: false
    }
) => access(object, accessor, undefined, { ...options, returnExists: true });
export const set = (
    object: object | unknown[],
    accessor: string,
    value: unknown,
    options?: AccessOptions
) => access(object, accessor, () => value, options);

export const toDotted = (object: Record<string, unknown>, arrayAccess = false) => {
    const result: Record<string, unknown> = {};

    function recurse(current: Record<string, unknown>, path: string[] = []) {
        for (const key in current) {
            if (current[key] instanceof Object && (arrayAccess || !Array.isArray(current[key]))) {
                recurse(current[key] as Record<string, unknown>, path.concat(key));
            } else {
                result[path.concat(key).join(".")] = current[key];
            }
        }
    }

    recurse(object);
    return result;
};

export const pickCastArray = <T = never>(target: object, key: string): T[] => {
    return key in target
        ? [target[key as keyof typeof target]]
        : target[`${key}s` as keyof typeof target];
};

/**
 * Unsets a property from an object or array.
 *
 * @param object The object or array to unset the property from.
 * @param accessor The accessor to the property to unset.
 */
export const unset = (object: object | unknown[], accessor: string) => {
    assert(accessor, "Accessor must be provided");

    const accessors = accessor.split(".");
    const lastAccessor = accessors.pop()!;
    let current: unknown = object;

    for (const access of accessors) {
        if (current instanceof Object) {
            if (!/\[\d+\]$/.test(access)) {
                current = current[access as keyof typeof current];
            } else {
                const array = current[
                    access.slice(0, access.indexOf("[")) as keyof typeof current
                ] as unknown as Array<unknown>;

                if (!Array.isArray(array)) {
                    throw new Error(`Cannot access index ${access} of non-array value`);
                }

                const index = parseInt(access.match(/\d+/)![0]);

                if (Number.isNaN(index)) {
                    throw new Error(`Invalid index ${index}`);
                }

                current = array[index];
            }
        } else {
            throw new Error(`Cannot access property ${access} of non-object value`);
        }
    }

    if (current instanceof Object) {
        if (!/\[\d+\]$/.test(lastAccessor)) {
            delete current[lastAccessor as keyof typeof current];
        } else {
            const array = current[
                lastAccessor.slice(0, lastAccessor.indexOf("[")) as keyof typeof current
            ] as unknown as Array<unknown>;

            if (!Array.isArray(array)) {
                throw new Error(`Cannot access index ${lastAccessor} of non-array value`);
            }

            const index = parseInt(lastAccessor.match(/\d+/)![0]);

            if (Number.isNaN(index)) {
                throw new Error(`Invalid index ${index}`);
            }

            array.splice(index, 1);
        }
    } else {
        throw new Error(`Cannot access property ${lastAccessor} of non-object value`);
    }
};
