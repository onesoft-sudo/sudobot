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

export function TestCase(target: object, key: PropertyKey): void;
export function TestCase(name: string): (target: object, key: PropertyKey) => void;

export function TestCase(target: object | string, key?: PropertyKey) {
    if (typeof target === "string") {
        const name = target;
        return (target: object, key: PropertyKey) => {
            const metadata = Reflect.getMetadata("test:cases", target) || new Map();
            metadata.set(key, { name });
            Reflect.defineMetadata("test:cases", metadata, target);
        };
    }

    const metadata = Reflect.getMetadata("test:cases", target) || new Map();
    metadata.set(key, {});
    Reflect.defineMetadata("test:cases", metadata, target);
}

export function BeforeEach(target: object, key?: PropertyKey) {
    const metadata = Reflect.getMetadata("test:beforeEach", target) || new Set();
    metadata.add(key);
    Reflect.defineMetadata("test:beforeEach", metadata, target);
}

export function BeforeAll(target: object, key?: PropertyKey) {
    const metadata = Reflect.getMetadata("test:beforeAll", target) || new Set();
    metadata.add(key);
    Reflect.defineMetadata("test:beforeAll", metadata, target);
}

export function AfterEach(target: object, key?: PropertyKey) {
    const metadata = Reflect.getMetadata("test:afterEach", target) || new Set();
    metadata.add(key);
    Reflect.defineMetadata("test:afterEach", metadata, target);
}

export function AfterAll(target: object, key?: PropertyKey) {
    const metadata = Reflect.getMetadata("test:afterAll", target) || new Set();
    metadata.add(key);
    Reflect.defineMetadata("test:afterAll", metadata, target);
}
