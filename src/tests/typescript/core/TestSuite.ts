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

import "reflect-metadata";

import { afterAll, afterEach, beforeAll, beforeEach, describe, test, type TestContext as ViTestContext } from "vitest";

function executeSuite(suite: object, name?: string) {
    describe(name ?? suite.constructor.name, () => {
        const tests = Reflect.getMetadata("test:cases", suite) || new Map();
        const beforeAllFns = Reflect.getMetadata("test:beforeAll", suite) || new Set<PropertyKey>();
        const beforeEachFns = Reflect.getMetadata("test:beforeEach", suite) || new Set<PropertyKey>();
        const afterAllFns = Reflect.getMetadata("test:afterAll", suite) || new Set<PropertyKey>();
        const afterEachFns = Reflect.getMetadata("test:afterEach", suite) || new Set<PropertyKey>();

        for (const key of beforeAllFns) {
            if (key in suite && typeof suite[key as keyof typeof suite] === "function") {
                const fn = suite[key as keyof typeof suite] as () => void;
                beforeAll(fn.bind(suite));
            }
        }

        for (const key of beforeEachFns) {
            if (key in suite && typeof suite[key as keyof typeof suite] === "function") {
                const fn = suite[key as keyof typeof suite] as () => void;
                beforeEach(fn.bind(suite));
            }
        }

        for (const key of afterAllFns) {
            if (key in suite && typeof suite[key as keyof typeof suite] === "function") {
                const fn = suite[key as keyof typeof suite] as () => void;
                afterAll(fn.bind(suite));
            }
        }

        for (const key of afterEachFns) {
            if (key in suite && typeof suite[key as keyof typeof suite] === "function") {
                const fn = suite[key as keyof typeof suite] as () => void;
                afterEach(fn.bind(suite));
            }
        }

        for (const [key, options] of tests) {
            if (key in suite && typeof suite[key as keyof typeof suite] === "function") {
                const fn = suite[key as keyof typeof suite] as () => void;
                test(options.name ?? key, fn.bind(suite));
            }
        }
    });
}

export function TestSuite(target: object): void;
export function TestSuite(target: string): (target: object) => void;

export function TestSuite(target: object | string) {
    if (typeof target === "string") {
        const name = target;

        return (target: object) => {
            const object = new (target as new () => object)();
            executeSuite(object, name);
        };
    }

    const object = new (target as new () => object)();
    executeSuite(object);
}

export type TestContext = ViTestContext;
