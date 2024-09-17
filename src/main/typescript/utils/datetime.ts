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

export function stringToTimeInterval(input: string, { milliseconds = false } = {}) {
    input = input.trim();

    if (input === "") {
        return { error: "No time value provided", result: NaN };
    }

    let seconds = +input;

    if (Number.isNaN(seconds)) {
        seconds = 0;

        for (let i = 0; i < input.length; i++) {
            let num = "";

            while (
                i < input.length &&
                (input[i] === "." || input[i] === " " || !isNaN(+input[i]))
            ) {
                if (input[i] !== " ") {
                    num += input[i];
                }
                i++;
            }

            const value = +num;

            if (num.trim().length === 0 || Number.isNaN(value)) {
                return { error: "Invalid numeric time value", result: NaN };
            }

            while (i < input.length && input[i] === " ") i++;

            const unit = input[i];

            switch (unit) {
                case "s":
                    seconds += value;
                    break;
                case "m":
                    seconds += value * 60;
                    break;
                case "h":
                    seconds += value * 3600;
                    break;
                case "d":
                    seconds += value * 86400;
                    break;
                case "w":
                    seconds += value * 604800;
                    break;

                case "M":
                    seconds += value * 2592000;
                    break;
                case "y":
                    seconds += value * 31536000;
                    break;
                default:
                    return {
                        error: "Invalid time unit: " + (unit ?? "(none provided)"),
                        result: NaN
                    };
            }
        }
    }

    return { error: null, result: seconds * (milliseconds ? 1000 : 1) };
}

export function displayDate(date: Date) {
    return displayTimeSeconds(Math.round(date.getTime() / 1000));
}

export function displayTimeSeconds(seconds: number) {
    return `<t:${seconds}:f> (<t:${seconds}:R>)`;
}
