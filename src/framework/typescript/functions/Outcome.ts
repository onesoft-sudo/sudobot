import OutcomeError from "./OutcomeError";
import { OutcomeState } from "./OutcomeState";

class Outcome<T, E> {
    public readonly state: OutcomeState;
    protected readonly result?: T;
    protected readonly error?: E;

    protected constructor(state: OutcomeState, result?: T, error?: E) {
        this.state = state;
        this.result = result;
        this.error = error;
    }

    public get() {
        if (this.state === OutcomeState.Done) {
            return this.result as T;
        }

        throw new OutcomeError("No value to return", {
            cause: this.error
        });
    }

    public getOrDefault(defaultValue: T) {
        if (this.state === OutcomeState.Done) {
            return this.result as T;
        }

        return defaultValue;
    }

    public isDone(): this is this & { state: OutcomeState.Done } {
        return this.state === OutcomeState.Done;
    }

    public isError(): this is this & { state: OutcomeState.Error } {
        return this.state === OutcomeState.Error;
    }

    public static createDone<T, E = never>(value: T) {
        return new Outcome<T, E>(OutcomeState.Done, value, undefined);
    }

    public static createError<E, T = never>(error: E) {
        return new Outcome<T, E>(OutcomeState.Error, undefined, error);
    }
}

export default Outcome;
