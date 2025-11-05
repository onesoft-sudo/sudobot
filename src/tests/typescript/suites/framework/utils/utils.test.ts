import Application from "@framework/app/Application";
import {
    also,
    escapeRegex,
    isDevelopmentMode,
    isSnowflake,
    notIn,
    requireNonNull,
    suppressErrorNoReturn
} from "@framework/utils/utils";
import { describe, expect, it, vi } from "vitest";

describe("utils", () => {
    describe("isDevelopmentMode", () => {
        it("works as expected", () => {
            process.env.NODE_ENV = "production";
            const isDevMode1 = isDevelopmentMode();
            process.env.NODE_ENV = undefined;
            const isDevMode2 = isDevelopmentMode();
            process.env.NODE_ENV = "development";
            const isDevMode3 = isDevelopmentMode();

            expect(isDevMode1).toBe(false);
            expect(isDevMode2).toBe(false);
            expect(isDevMode3).toBe(true);
        });
    });

    describe("escapeRegex", () => {
        it("correctly escapes regex strings", () => {
            const escaped = escapeRegex("^.+$");
            const regex = new RegExp(`^${escaped}da$`);
            const string1 = "^.+$da";
            const string2 = "fui4yuu474878d";
            expect(regex.test(string1)).toBe(true);
            expect(regex.test(string2)).toBe(false);
        });
    });

    describe("requireNonNull", () => {
        it("throws error when the given argument is null or undefined", () => {
            expect(requireNonNull("Test")).toBe("Test");
            expect(() => requireNonNull(null)).toThrowError();
            expect(() => requireNonNull(undefined)).toThrowError();
        });
    });

    describe("notIn", () => {
        it("checks if key(s) are not in the given objects correctly", () => {
            expect(notIn({ a: 1, b: 2 } as Record<string, number>, "c")).toBe(true);
            expect(notIn({ a: 1, b: 2 } as Record<string, number>, "b")).toBe(false);
        });
    });

    describe("also", () => {
        it("should not modify the source object", () => {
            const callback = vi.fn((value: string) => value + "modified");
            expect(also("Hello", callback)).toBe("Hello");
            expect(callback).toHaveBeenCalledExactlyOnceWith("Hello");
        });
    });

    describe("isSnowflake", () => {
        it("should validate given values correctly", () => {
            expect(isSnowflake("test123")).toBe(false);
            expect(isSnowflake("abcd")).toBe(false);
            expect(isSnowflake("1")).toBe(false);
            expect(isSnowflake("12345")).toBe(false);
            expect(isSnowflake("12345429873417671")).toBe(true);
            expect(isSnowflake("1234542987341767123847714367135315366347665")).toBe(false);
        });
    });

    describe("suppressErrorNoReturn", () => {
        it("should suppress promise rejections", () => {
            new Application({ projectRootDirectoryPath: "", rootDirectoryPath: "", version: "" });
            const promise = Promise.resolve();
            const fn = vi.fn();
            promise.catch = fn;
            suppressErrorNoReturn(promise);
            expect(fn).toHaveBeenCalledOnce();
        });
    });
});
