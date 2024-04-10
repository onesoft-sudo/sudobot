import { describe, expect, it } from "vitest";
import {
    PromiseWithResolversReturn,
    promiseWithResolvers
} from "../../../src/framework/polyfills/Promise";

declare global {
    interface PromiseConstructor {
        withResolvers?<T>(): PromiseWithResolversReturn<T>;
    }
}

describe("Promise polyfill", () => {
    it("should polyfill Promise.withResolvers", async () => {
        // Arrange
        const originalPromise = Promise;

        // Act
        delete Promise.withResolvers;
        const { promise, resolve, reject } = promiseWithResolvers<void>();

        // Assert
        expect(promise).toBeInstanceOf(originalPromise);
        expect(resolve).toBeInstanceOf(Function);
        expect(reject).toBeInstanceOf(Function);
    });
});
