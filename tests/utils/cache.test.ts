import { cache, resetCache } from "@/utils/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("caching utilities", () => {
    beforeEach(() => {
        resetCache();
    });

    it("should cache a value", () => {
        const callback = vi.fn(() => Math.random());
        const cached = cache("callback", callback);
        expect(cached()).toBe(cached());
        expect(callback.mock.calls.length).toBe(1);
    });

    it("should cache a value with a TTL", { repeats: 10 }, async () => {
        const callback = vi.fn(() => Math.random());
        const cached = cache("callback", callback, { ttl: 100 });
        expect(cached()).toBe(cached());
        expect(callback.mock.calls.length).toBe(1);
        await new Promise(resolve => setTimeout(resolve, 110));
        expect(cached()).toBe(cached());
        expect(callback.mock.calls.length).toBe(2);
    });

    it("should cache a value with an onHit callback", () => {
        const callback = vi.fn(() => Math.random());
        const onHit = vi.fn();
        const cached = cache("callback", callback, { onHit });
        expect(cached()).toBe(cached());
        expect(onHit.mock.calls.length).toBe(1);
    });

    it("should cache a value with an onHit callback and a TTL", { repeats: 10 }, async () => {
        const callback = vi.fn(() => Math.random());
        const onHit = vi.fn();
        const cached = cache("callback", callback, { ttl: 100, onHit });
        expect(cached()).toBe(cached());
        expect(onHit.mock.calls.length).toBe(1);
        await new Promise(resolve => setTimeout(resolve, 110));
        expect(cached()).toBe(cached());
        expect(onHit.mock.calls.length).toBe(2);
    });

    it("it should cache a value with an invoke option", () => {
        const callback = vi.fn(() => Math.random());
        const cached = cache("callback", callback, { invoke: true });
        expect(cached).toBe(cached);
        expect(callback.mock.calls.length).toBe(1);
    });

    it("it can clear the cache", () => {
        const callback = vi.fn(() => Math.random());
        const cached = cache("callback", callback);
        expect(cached()).toBe(cached());
        resetCache();
        expect(cached()).toBe(cached());
        expect(callback.mock.calls.length).toBe(2);
    });
});
