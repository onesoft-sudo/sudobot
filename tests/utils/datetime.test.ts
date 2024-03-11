import { describe, expect, it } from "vitest";
import { displayDate, displayTimeSeconds, stringToTimeInterval } from "../../src/utils/datetime";

describe("datetime utilities", () => {
    it("should display a date", () => {
        const date = new Date("2020-01-01T00:00:00Z");
        expect(displayDate(date)).toBe(
            `<t:${date.getTime() / 1000}:f> (<t:${date.getTime() / 1000}:R>)`
        );
    });

    it("should display a time in seconds", () => {
        expect(displayTimeSeconds(0)).toBe("<t:0:f> (<t:0:R>)");
        expect(displayTimeSeconds(1)).toBe("<t:1:f> (<t:1:R>)");
        expect(displayTimeSeconds(6400)).toBe("<t:6400:f> (<t:6400:R>)");
    });

    it("should convert a string to a time interval", () => {
        expect(stringToTimeInterval("0")).toEqual({ error: null, result: 0 });
        expect(stringToTimeInterval("1")).toEqual({ error: null, result: 1 });
        expect(stringToTimeInterval("1s")).toEqual({ error: null, result: 1 });
        expect(stringToTimeInterval("1m")).toEqual({ error: null, result: 60 });
        expect(stringToTimeInterval("1h")).toEqual({ error: null, result: 3600 });
        expect(stringToTimeInterval("1d")).toEqual({ error: null, result: 86400 });
        expect(stringToTimeInterval("1w")).toEqual({ error: null, result: 604800 });
        expect(stringToTimeInterval("1M")).toEqual({ error: null, result: 2592000 });
        expect(stringToTimeInterval("1y")).toEqual({ error: null, result: 31536000 });
    });

    it("should convert a string with decimals to a time interval", () => {
        expect(stringToTimeInterval("1.5s")).toEqual({ error: null, result: 1.5 });
        expect(stringToTimeInterval("1.5m")).toEqual({ error: null, result: 90 });
        expect(stringToTimeInterval("1.5h")).toEqual({ error: null, result: 5400 });
        expect(stringToTimeInterval("1.5d")).toEqual({ error: null, result: 129600 });
        expect(stringToTimeInterval("1.5w")).toEqual({ error: null, result: 907200 });
        expect(stringToTimeInterval("1.5M")).toEqual({ error: null, result: 3888000 });
        expect(stringToTimeInterval("1.5y")).toEqual({ error: null, result: 47304000 });
    });

    it("should handle a string with mixed units, spaces and values", () => {
        expect(stringToTimeInterval(" 15s15m22h 14d1w                 157M 12y    ")).toEqual({
            error: null,
            result:
                15 + 15 * 60 + 22 * 3600 + 14 * 86400 + 7 * 86400 + 157 * 2592000 + 12 * 31536000
        });
    });

    it("should handle invalid time values", () => {
        expect(stringToTimeInterval("1x")).toEqual({ error: "Invalid time unit: x", result: NaN });
    });

    it("should handle invalid numeric time values", () => {
        expect(stringToTimeInterval("x")).toEqual({
            error: "Invalid numeric time value",
            result: NaN
        });
    });
});
