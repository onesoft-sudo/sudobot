/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025 OSN Developers.
 *
 * SudoBot is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SudoBot is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
 */

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
