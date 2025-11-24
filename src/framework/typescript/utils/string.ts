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

export function normalize(str: string, skip = false) {
    if (skip) {
        return str;
    }

    return str.replace(/[\u0300-\u036f]/g, "");
}

export function isDigit(char: string) {
    return char >= "0" && char <= "9";
}

export function isAlpha(char: string) {
    return (char >= "a" && char <= "z") || (char >= "A" && char <= "Z");
}

export function preformat(args: TemplateStringsArray, ...values: unknown[]) {
    let fullString = "";

    for (const part of args) {
        fullString += part.replace(/^\s+|\s*\n$/gm, "") + (values.shift()?.toString() ?? "");
    }

    return fullString;
}

export const f = preformat;
export const stripIndents = preformat;
