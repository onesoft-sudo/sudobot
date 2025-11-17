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
