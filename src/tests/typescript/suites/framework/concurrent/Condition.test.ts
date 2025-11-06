import Condition from "@framework/concurrent/Condition";
import { beforeEach, describe, expect, it } from "vitest";

describe("Condition", () => {
    let condition: Condition;

    beforeEach(() => {
        condition = new Condition();
    });

    it("should wait until signaled", async () => {
        let isSignaled = false;

        setTimeout(() => {
            condition.signal();
            isSignaled = true;
        }, 100);

        await condition.wait();

        expect(isSignaled).toBe(true);
    });

    it("should handle multiple waiters", async () => {
        let isSignaled1 = false;
        let isSignaled2 = false;

        setTimeout(() => {
            condition.signal();
            isSignaled1 = true;
        }, 100);

        setTimeout(() => {
            condition.signal();
            isSignaled2 = true;
        }, 200);

        await Promise.all([condition.wait(), condition.wait()]);

        expect(isSignaled1).toBe(true);
        expect(isSignaled2).toBe(true);
    });
});
