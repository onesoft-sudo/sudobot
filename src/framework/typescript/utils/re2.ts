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
