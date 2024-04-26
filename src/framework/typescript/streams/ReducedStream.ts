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
