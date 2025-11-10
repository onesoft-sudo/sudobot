import { describe, expect, it } from "vitest";
import { Memoize } from "@framework/decorators/Memoize";

describe("Memoize", () => {
    it("memoizes functions as expected", () => {
        class User {
            @Memoize
            public getId() {
                return Math.round(Math.random() * 1000000);
            }
        }

        const user = new User();
        expect(user.getId()).toBe(user.getId());
    });
});
