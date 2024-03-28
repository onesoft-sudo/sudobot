import { notIn, requireNonNull } from "@framework/utils/utils";
import { describe, expect, it } from "vitest";

describe("utils", () => {
    describe("notIn", () => {
        it("should return true if the key is not in the object", () => {
            expect(notIn({} as Record<string, string>, "key")).toBe(true);
        });

        it("should return false if the key is in the object", () => {
            expect(notIn({ key: "value" } as Record<string, string>, "key")).toBe(false);
        });
    });

    describe("requireNonNull", () => {
        it("should throw an error if the value is null", () => {
            expect(() => requireNonNull(null)).toThrowError("Value cannot be null or undefined");
        });

        it("should throw an error if the value is undefined", () => {
            expect(() => requireNonNull(undefined)).toThrowError(
                "Value cannot be null or undefined"
            );
        });

        it("should return the value if it is not null", () => {
            expect(requireNonNull(1)).toBe(1);
        });
    });
});
