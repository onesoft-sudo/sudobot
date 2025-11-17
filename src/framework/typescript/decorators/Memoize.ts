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

import type { AnyFunction } from "@framework/types/Utils";

const memoizedStateSymbol = Symbol("MemoizedState");

export function Memoize<T extends object>(target: T, propertyKey: PropertyKey, context?: PropertyDescriptor) {
    if (!context) {
        return;
    }

    const current = target[propertyKey as keyof T] as AnyFunction;
    let memoizedValue: unknown;
    let memoized = false;

    context.value = function (this: unknown, ...args: never[]) {
        if (!memoized) {
            memoizedValue = current.call(this, ...args);
        }

        memoized = true;
        return memoizedValue;
    };

    Object.defineProperty(context.value, memoizedStateSymbol, {
        value: {
            reset: () => {
                memoized = false;
            }
        }
    });
}

export const resetMemoizedFunction = (fn: AnyFunction) =>
    memoizedStateSymbol in fn ? (fn[memoizedStateSymbol] as { reset: () => void }).reset() : void 0;
