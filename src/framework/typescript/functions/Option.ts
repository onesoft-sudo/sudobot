/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025 OSN Developers.
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

import EmptyOptionError from "./EmptyOptionError";

class Option<in out T> {
    private readonly value?: T;
    private readonly hasValue: boolean;

    private constructor(value: T | undefined, hasValue: boolean) {
        this.value = value;
        this.hasValue = hasValue;
    }

    public static empty<T>() {
        return new Option<T>(undefined, false);
    }

    public static withValue<T>(value: T) {
        return new Option<T>(value, true);
    }

    /**
     * Get the value.
     *
     * @returns The value if available.
     * @throws {TypeError} If the option instance is empty.
     */
    public get() {
        if (!this.hasValue) {
            throw new EmptyOptionError("Attempted to get value on an empty Option<T> instance");
        }

        return this.value as T;
    }

    public getOrDefault(fallback: T) {
        if (!this.hasValue) {
            return fallback;
        }

        return this.value as T;
    }
}

export default Option;
