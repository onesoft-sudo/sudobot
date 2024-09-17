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

const CallableSymbol = Symbol("Callable");

abstract class Callable extends Function {
    public readonly [CallableSymbol]: this;

    public constructor() {
        super("...args", "return this._invoke(...args)");
        this[CallableSymbol] = this.bind(this);
        return this[CallableSymbol];
    }

    protected abstract invoke(...args: unknown[]): unknown;

    private _invoke(...args: unknown[]) {
        return this.invoke(...args);
    }

    public [Symbol.toStringTag]() {
        return this.toString();
    }

    public override toString() {
        return this.constructor.name;
    }
}

export default Callable;
