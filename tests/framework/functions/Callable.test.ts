import Callable from "@framework/functions/Callable";
import { beforeEach, describe, expect, it } from "vitest";

describe("Callable", () => {
    let MyObject: new () => Callable;
    let callable: Callable;

    beforeEach(() => {
        MyObject = class MyObject extends Callable {
            protected invoke(...args: number[]) {
                return args.reduce((a, b) => a + b, 0);
            }
        };

        callable = new MyObject();
    });

    it("should create a callable object", () => {
        expect(callable).toBeInstanceOf(Function);
        expect(callable(1, 2, 5)).toBe(8);
    });

    it("should return the correct name", () => {
        expect(callable.toString()).toBe("MyObject");
        expect(callable[Symbol.toStringTag]()).toBe("MyObject");
    });

    it("should be callable with other methods", () => {
        expect(callable(1, 2, 5)).toBe(8);
        expect(callable.call(null, 1, 2, 5)).toBe(8);
        expect(callable.apply(null, [1, 2, 5])).toBe(8);
    });
});
