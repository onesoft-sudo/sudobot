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

export type DefaultExport<T> = {
    default: T;
};

export type Class<I = unknown, A extends Array<unknown> = unknown[]> = new (...a: A) => I;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TODO = any;

export type ArrayLike<T> = {
    [K: number]: T;
};

export type If<T extends boolean, A, B> = T extends true ? A : B;

export type ArrayOrElement<T> = T | T[];
export type AnyFunction = (...args: never[]) => unknown;
