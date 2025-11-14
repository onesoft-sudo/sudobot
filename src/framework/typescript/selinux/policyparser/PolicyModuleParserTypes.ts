import type { PolicyModuleTokenType } from "./PolicyModuleTokenType";

export type Location = readonly [index: number, line: number, column: number];

export type Range = {
    start: Location;
    end: Location;
};

export type Token = {
    type: PolicyModuleTokenType;
    value: string;
    loc: Range;
};
