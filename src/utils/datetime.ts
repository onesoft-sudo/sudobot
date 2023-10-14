/*
* This file is part of SudoBot.
*
* Copyright (C) 2021-2023 OSN Developers.
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

export function stringToTimeInterval(input: string, { milliseconds = false } = {}) {
    let seconds = 0;
    let number = "";

    for (let i = 0; i < input.length; i++) {
        if (["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "."].includes(input[i])) {
            number += input[i];
        } else {
            const unit = input.substring(i);
            const float = parseFloat(number.toString());

            if (Number.isNaN(float)) {
                return { error: "Invalid numeric time value", result: NaN };
            }

            if (["s", "sec", "secs", "second", "seconds"].includes(`${unit}`)) {
                seconds += float;
            } else if (["m", "min", "mins", "minute", "minutes"].includes(`${unit}`)) {
                seconds += float * 60;
            } else if (["h", "hr", "hrs", "hour", "hours"].includes(unit)) {
                seconds += float * 60 * 60;
            } else if (["d", "dy", "dys", "day", "days"].includes(unit)) {
                seconds += float * 60 * 60 * 24;
            } else if (["w", "wk", "wks", "week", "weeks"].includes(unit)) {
                seconds += float * 60 * 60 * 24 * 7;
            } else if (["M", "mo", "mos", "month", "months"].includes(unit)) {
                seconds += float * 60 * 60 * 24 * 30;
            } else if (["y", "yr", "yrs", "year", "years"].includes(unit)) {
                seconds += float * 60 * 60 * 24 * 365;
            } else {
                return { error: "Invalid time unit", result: NaN };
            }

            break;
        }
    }

    return { error: undefined, result: seconds * (milliseconds ? 1000 : 1) };
}

export function displayDate(date: Date) {
    return displayTimeSeconds(Math.round(date.getTime() / 1000));
}

export function displayTimeSeconds(seconds: number) {
    return `<t:${seconds}:f> (<t:${seconds}:R>)`;
}
