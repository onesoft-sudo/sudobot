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

import Callable from "@framework/functions/Callable";
import { beforeEach, describe, expect, it } from "vitest";

describe("Callable", () => {
    let MyObject: new () => Callable;
    let callable: Callable;

    beforeEach(() => {
        MyObject = class MyObject extends Callable {
            protected invoke(...args: number[]) {
                return args.reduce((a, b) => a + b, 0);
            }
        };

        callable = new MyObject();
    });

    it("should create a callable object", () => {
        expect(callable).toBeInstanceOf(Function);
        expect(callable(1, 2, 5)).toBe(8);
    });

    it("should return the correct name", () => {
        expect(callable.toString()).toBe("MyObject");
        expect(callable[Symbol.toStringTag]()).toBe("MyObject");
    });

    it("should be callable with other methods", () => {
        expect(callable(1, 2, 5)).toBe(8);
        expect(callable.call(null, 1, 2, 5)).toBe(8);
        expect(callable.apply(null, [1, 2, 5])).toBe(8);
    });
});
