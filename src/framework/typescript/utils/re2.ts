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

import { RE2JS } from "re2js";

type RE2Type = (...args: ConstructorParameters<typeof RegExp>) => RegExp;

let re2: RE2Type | null | undefined;

try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    re2 = require("re2" as string);
} catch {
    re2 = null;
}

export const getRE2JSFlag = (flag: string) => {
    switch (flag) {
        case "i":
            return RE2JS.CASE_INSENSITIVE;

        case "m":
            return RE2JS.MULTILINE;
    }

    return 0;
};

export const regexTest = (regex: RegExp | RE2JS, testSubject: string) => {
    if (regex instanceof RE2JS) {
        return regex.matches(testSubject);
    }

    return regex.test(testSubject);
};

export const createRegex = (regex: RegExp | string, flags: string = "") => {
    if (re2) {
        return re2(regex, flags);
    }

    if (typeof regex === "string") {
        return RE2JS.compile(regex, getRE2JSFlag(flags));
    }

    return RE2JS.compile(regex.source, getRE2JSFlag(regex.flags + flags));
};
