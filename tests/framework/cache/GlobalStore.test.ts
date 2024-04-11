import { afterEach, describe, expect, it } from "vitest";
import * as cache from "../../../src/framework/cache/GlobalStore";
import { createApplication } from "../../mocks/application.mock";

describe("GlobalStore", () => {
    createApplication();

    afterEach(() => {
        cache.clear();
    });

    it("should be able to store and retrieve data", () => {
        cache.set("test", "value");
        expect(cache.get("test")).toBe("value");
    });

    it("should be able to store and retrieve data with dependencies", async () => {
        await cache.withDeps("test", () => "value", ["dep"]);
        const value1 = await cache.withDeps("test", () => "value2", ["dep"]);
        const value2 = await cache.withDeps("test", () => "value2", ["dep2"]);

        expect(value1).toBe("value");
        expect(value2).toBe("value2");
    });

    it("dependencies work even if they are references", async () => {
        const dep = [["dep"]];
        await cache.withDeps("test", () => "value", dep);
        const value1 = await cache.withDeps("test", () => "value2", dep);
        const value2 = await cache.withDeps("test", () => "value3", [["dep"]]);
        const value3 = await cache.withDeps("test", () => "value4", [["dep2"]]);
        expect(value1).toBe("value");
        expect(value2).toBe("value");
        expect(value3).toBe("value4");
    });

    it("should be able to store and retrieve data with TTL", async () => {
        await cache.set("test", "value", { ttl: 100 });
        await new Promise(resolve => setTimeout(resolve, 200));
        expect(cache.get("test")).toBeUndefined();
    });

    it("should be able to store and retrieve data with max hits", async () => {
        await cache.set("test1", "value", { maxHits: 1 });
        expect(cache.get("test1")).toBe("value");
        expect(cache.get("test1")).toBe(undefined);
    });

    it("should be able to store and retrieve data with dependencies and TTL", async () => {
        await cache.withDeps("test", () => "value", ["dep"], { ttl: 100 });
        await new Promise(resolve => setTimeout(resolve, 200));
        expect(cache.get("test")).toBeUndefined();
    });

    it("should be able to store and retrieve data with dependencies and max hits", async () => {
        await cache.withDeps("test", () => "value", ["dep"], { maxHits: 1 });
        expect(cache.get("test")).toBe("value");
        expect(cache.get("test")).toBeUndefined();
    });
});
