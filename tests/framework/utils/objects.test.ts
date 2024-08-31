import * as objects from "@framework/utils/objects";
import { describe, expect, it } from "vitest";

describe("utils/objects", () => {
    describe("get", () => {
        it("should return the value at the specified path", () => {
            const object = {
                a: {
                    b: {
                        c: "value"
                    }
                }
            };

            expect(objects.get(object, "a.b.c")).toBe("value");
        });

        it("should return undefined if the path does not exist", () => {
            const object = {
                a: {
                    b: {
                        c: "value"
                    }
                }
            };

            expect(objects.get(object, "a.b.d")).toBeUndefined();
        });

        it("should return undefined if the path is invalid", () => {
            const object = {
                a: {
                    b: {
                        c: "value"
                    }
                }
            };

            expect(objects.get(object, "a.b.c.d")).toBeUndefined();
        });

        it("should return undefined if the object is null", () => {
            expect(objects.get(null as unknown as object, "a.b.c")).toBeUndefined();
        });

        it("should return undefined if the object is undefined", () => {
            expect(objects.get(undefined as unknown as object, "a.b.c")).toBeUndefined();
        });

        it("should return undefined if the object is not an object", () => {
            expect(objects.get("string" as unknown as object, "a.b.c")).toBeUndefined();
        });

        it("should throw if the path is not a string or is empty string", () => {
            const object = {
                a: {
                    b: {
                        c: "value"
                    }
                }
            };

            expect(() => objects.get(object, 1 as unknown as string)).toThrowError();
            expect(() => objects.get(object, "" as unknown as string)).toThrowError();
        });

        it("should return undefined if the path is a space", () => {
            const object = {
                a: {
                    b: {
                        c: "value"
                    }
                }
            };

            expect(objects.get(object, " ")).toBeUndefined();
        });

        it("should return undefined if the path is a period", () => {
            const object = {
                a: {
                    b: {
                        c: "value"
                    }
                }
            };

            expect(objects.get(object, ".")).toBeUndefined();
        });
    });
});
