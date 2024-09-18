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

import { pgEnum as drizzlePgEnum } from "drizzle-orm/pg-core";

export function enumToPgEnum<T extends Record<string, string>>(target: T) {
    return Object.values(target).map((value: unknown) => `${value as string}`) as [
        T[keyof T],
        ...T[keyof T][]
    ];
}

export function pgEnum<T extends Record<string, string>>(name: string, target: T) {
    return drizzlePgEnum(name, enumToPgEnum<T>(target));
}
