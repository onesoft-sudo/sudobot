/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
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

type AccessOptions = {
    noCreate?: boolean;
    noModify?: boolean;
    noArrayAccess?: boolean;
    returnExists?: boolean;
};

const access = (object: object | unknown[], accessor: string, setter?: (value: unknown) => unknown, options?: AccessOptions) => {
    const accessors = accessor.split(".");
    let current: unknown = object;
    let prevAccessor: string | undefined;

    if (accessors.length === 0 || !accessor) {
        return object;
    }

    for (const access of accessors) {
        const last = access === accessors[accessors.length - 1];

        if (current instanceof Object) {
            if (!options?.noArrayAccess && /\[\d+\]$/.test(access)) {
                const array = current[access.slice(0, access.indexOf("[")) as keyof typeof current] as unknown as Array<unknown>;

                if (!Array.isArray(array)) {
                    throw new Error(`Cannot access index ${access} of non-array value (${prevAccessor ?? "root"})`);
                }

                const index = parseInt(access.match(/\d+/)![0]);

                if (Number.isNaN(index)) {
                    throw new Error(`Invalid index ${index} (${prevAccessor ?? "root"})`);
                }

                current = array[index];

                if (options?.returnExists && last) {
                    return index in array;
                }

                if (setter && last && (!options?.noModify || !(index in array)) && (!options?.noCreate || index < array.length)) {
                    array[index] = setter(current);
                }
            } else {
                if (Array.isArray(current)) {
                    return options?.returnExists ? false : undefined;
                }

                const value = current[access as keyof typeof current];

                if (options?.returnExists && last) {
                    return access in current;
                }

                if (setter && last && (!options?.noModify || !(access in current)) && (!options?.noCreate || access in current)) {
                    (current as Record<PropertyKey, unknown>)[access as PropertyKey] = setter(current);
                }

                current = value;
            }
        } else {
            if (last) {
                return options?.returnExists ? false : undefined;
            }

            return current;
        }
    }

    return options?.returnExists ? true : current;
};

export const get = <V = unknown>(object: object | unknown[], accessor: string, options?: AccessOptions) =>
    access(object, accessor, undefined, options) as V;
export const has = (object: object | unknown[], accessor: string, options?: AccessOptions) =>
    access(object, accessor, undefined, { ...options, returnExists: true });
export const set = (object: object | unknown[], accessor: string, value: unknown, options?: AccessOptions) =>
    access(object, accessor, () => value, options);

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
