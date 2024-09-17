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

import type Stream from "@framework/streams/Stream";
import chalk from "chalk";
import util from "util";

class ReducedStream<T, R> {
    private _stream: Stream<T>;
    private _reducer: (accumulator: R, item: T) => R;
    private _initialValue?: R;
    private _reduced: R | undefined;
    private _computed: boolean = false;

    public constructor(
        stream: Stream<T>,
        reducer: (accumulator: R, item: T) => R,
        initialValue?: R
    ) {
        this._stream = stream;
        this._reducer = reducer;
        this._initialValue = initialValue;
    }

    public get() {
        if (this._computed && this._reduced !== undefined) {
            return this._reduced;
        }

        let result = this._initialValue as R;

        for (const item of this._stream) {
            result = this._reducer(result, item);
        }

        this._reduced = result;
        this._computed = true;
        return result;
    }

    public get [Symbol.toStringTag](): string {
        return `ReducedStream <${this._stream.computeCompleted && this._computed ? "Compute Finished" : "Computing"}>`;
    }

    public [util.inspect.custom]() {
        return chalk.cyanBright(`[${this[Symbol.toStringTag]}]`);
    }
}

export default ReducedStream;
