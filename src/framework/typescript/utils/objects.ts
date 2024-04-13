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

export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const shallowCopy = { ...obj };

    for (const key of keys) {
        delete shallowCopy[key];
    }

    return shallowCopy;
}

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const shallowCopy = {} as Pick<T, K>;

    for (const key of keys) {
        shallowCopy[key] = obj[key];
    }

    return shallowCopy;
}
