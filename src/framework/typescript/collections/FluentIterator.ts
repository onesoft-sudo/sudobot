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

class FluentIterator {
    public static slice<T>(data: Iterable<T>, offset: number, limit?: number): Array<T>;
    public static slice<T>(data: Iterable<T>, limit: number): Array<T>;

    public static slice<T>(data: Iterable<T>, offsetOrLimit: number, _limit?: number): Array<T> {
        const array = [];
        const limit = _limit ?? offsetOrLimit;
        let offset = _limit ? offsetOrLimit : 0;

        for (const item of data) {
            if (offset > 0) {
                offset--;
                continue;
            }

            if (array.length >= limit) {
                break;
            }

            array.push(item);
        }

        return array;
    }
}

export default FluentIterator;
