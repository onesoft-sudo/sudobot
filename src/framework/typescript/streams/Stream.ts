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

import ReducedStream from "@framework/streams/ReducedStream";
import chalk from "chalk";
import util from "node:util";

type IteratorProcessor<T> =
    | {
          type: "filter";
          fn: (item: T) => boolean;
      }
    | {
          type: "map";
          fn: (item: T) => unknown;
      };

class Stream<T> implements Iterable<T> {
    private readonly _iterable: Iterable<T>;
    private readonly _processors: Array<IteratorProcessor<T>> = [];
    private _computed: boolean = false;
    private _result: T[] | undefined;

    public constructor(iterable: Iterable<T>) {
        this._iterable = iterable;
    }

    private concatIterables(...iterables: Iterable<T>[]): Iterable<T> {
        return {
            *[Symbol.iterator]() {
                for (const iterable of iterables) {
                    for (const item of iterable) {
                        yield item;
                    }
                }
            }
        };
    }

    public *[Symbol.iterator](): Iterator<T> {
        if (this._computed && this._result !== undefined) {
            return this._result;
        }

        this._result = [];

        iterate: for (let value of this._iterable) {
            for (const processor of this._processors) {
                switch (processor.type) {
                    case "filter":
                        if (!processor.fn(value)) {
                            continue iterate;
                        }

                        break;

                    case "map":
                        value = processor.fn(value) as T;
                        break;
                }
            }

            this._result.push(value);
            yield value;
        }

        this._computed = true;
    }

    public static from<T>(stream: Stream<T>) {
        const newStream = new Stream(stream._iterable);
        newStream._processors.push(...stream._processors);
        return newStream;
    }

    public filter(predicate: (item: T) => boolean): Stream<T> {
        const stream = Stream.from(this);

        stream._processors.push({
            fn: predicate,
            type: "filter"
        });

        return stream;
    }

    public map<R>(mapper: (item: T) => R): Stream<R> {
        const stream = Stream.from(this);

        stream._processors.push({
            fn: mapper,
            type: "map"
        });

        return stream as unknown as Stream<R>;
    }

    public at(index: number): T | undefined {
        if (this._computed && this._result !== undefined) {
            return this._result[index];
        }

        let i = 0;

        for (const item of this) {
            if (i === index) {
                return item;
            }

            i++;
        }

        return undefined;
    }

    public concat(stream: Stream<T>): Stream<T> {
        return new Stream(this.concatIterables(this, stream));
    }

    public slice(start: number, end: number): Stream<T> {
        if (start < 0) {
            throw new RangeError("Start index cannot be negative with streams");
        }

        if (end < 0) {
            throw new RangeError("End index cannot be negative with streams");
        }

        const iterable = {} as {
            target: Stream<T>;
            [Symbol.iterator]: () => Generator<T>;
        };

        Object.defineProperty(iterable, "target", {
            configurable: false,
            enumerable: false,
            writable: false,
            value: this
        });

        Object.defineProperty(iterable, Symbol.iterator, {
            configurable: false,
            enumerable: true,
            writable: false,
            value: function* (this: typeof iterable) {
                let i = 0;

                for (const item of this.target) {
                    if (i >= start && i < end) {
                        yield item;
                    }

                    i++;
                }
            }
        });

        return new Stream(iterable);
    }

    public reduce<R>(
        reducer: (accumulator: R, item: T) => R,
        initialValue: R
    ): ReducedStream<T, R> {
        return new ReducedStream(this, reducer, initialValue);
    }

    public toArray(): T[] {
        return Array.from(this);
    }

    public get computeCompleted(): boolean {
        return this._computed;
    }

    public get [Symbol.toStringTag](): string {
        return `Stream <${this._computed ? "Compute Finished" : "Computing"}>`;
    }

    public [util.inspect.custom]() {
        return chalk.cyanBright(`[${this[Symbol.toStringTag]}]`);
    }
}

export default Stream;
