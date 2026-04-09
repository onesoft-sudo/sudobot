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

import type { SerializableToJSON } from "../types/SerializableToJSON";

class FluentSet<T> extends Set<T> implements SerializableToJSON<T[]> {
    public override add(...values: T[]) {
        for (const value of values) {
            super.add(value);
        }

        return this;
    }

    public override delete(...values: T[]) {
        let ret = true;

        for (const value of values) {
            ret &&= super.delete(value);
        }

        return ret;
    }

    public remove(...values: T[]) {
        this.delete(...values);
        return this;
    }

    public toArray() {
        return Array.from(this);
    }

    public toJSON() {
        return this.toArray();
    }

    public hasAll(...values: T[]) {
        for (const value of values) {
            if (!this.has(value)) {
                return false;
            }
        }

        return true;
    }

    public hasAny(...values: T[]) {
        for (const value of values) {
            if (this.has(value)) {
                return true;
            }
        }

        return false;
    }

    public combine(...sets: FluentSet<T>[]) {
        for (const set of sets) {
            for (const value of set) {
                this.add(value);
            }
        }

        return this;
    }

    public static fromValues<T>(...values: Array<T>) {
        const set = new FluentSet<T>();

        for (const value of values) {
            set.add(value);
        }

        return set;
    }

    public static fromArrays<T>(...values: Array<T[] | undefined | null>) {
        const set = new FluentSet<T>();

        for (const value of values.flat()) {
            if (!value) {
                continue;
            }

            set.add(value);
        }

        return set;
    }

    public static fromFluentSets<T>(...values: Array<FluentSet<T> | undefined | null>) {
        return new FluentSet<T>().combine(
            ...values.filter(
                (value): value is FluentSet<T> => value !== null && value !== undefined
            )
        );
    }

    public map<U>(callback: (value: T, index: number, set: FluentSet<T>) => U) {
        const set = new FluentSet<U>();
        let index = 0;

        for (const value of this) {
            set.add(callback(value, index++, this));
        }

        return set;
    }
}

export default FluentSet;
