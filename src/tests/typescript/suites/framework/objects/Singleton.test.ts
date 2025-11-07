import { describe, it, expect } from "vitest";
import Singleton from "@framework/objects/Singleton";

describe("Singleton", () => {
    it("creates instances correctly", () => {
        class Obj extends Singleton {
            public constructor() {
                super();
            }
        }

        const obj1 = new Obj();
        const obj2 = new Obj();

        expect(obj1).toBe(obj2);
    });
});
