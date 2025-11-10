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

import Duration from "@framework/datetime/Duration";
import { describe, expect, it } from "vitest";

describe("Duration", () => {
    describe("constructor", () => {
        it("should create a new instance with default values", () => {
            const duration = new Duration({});
            expect(duration.years).toBe(0);
            expect(duration.months).toBe(0);
            expect(duration.weeks).toBe(0);
            expect(duration.days).toBe(0);
            expect(duration.hours).toBe(0);
            expect(duration.minutes).toBe(0);
            expect(duration.seconds).toBe(0);
            expect(duration.milliseconds).toBe(0);
        });

        it("should create a new instance with the given values", () => {
            const duration = new Duration({
                years: 1,
                months: 2,
                weeks: 3,
                days: 4,
                hours: 5,
                minutes: 6,
                seconds: 7,
                milliseconds: 8
            });
            expect(duration.years).toBe(1);
            expect(duration.months).toBe(2);
            expect(duration.weeks).toBe(3);
            expect(duration.days).toBe(4);
            expect(duration.hours).toBe(5);
            expect(duration.minutes).toBe(6);
            expect(duration.seconds).toBe(7);
            expect(duration.milliseconds).toBe(8);
        });
    });

    describe("toJSON", () => {
        it("should return the serialized duration", () => {
            const duration = new Duration({
                years: 1,
                months: 2,
                weeks: 3,
                days: 4,
                hours: 5,
                minutes: 6,
                seconds: 7,
                milliseconds: 8
            });

            expect(duration.toJSON()).toBe(
                1 * 31536000000 + 2 * 2592000000 + 3 * 604800000 + 4 * 86400000 + 5 * 3600000 + 6 * 60000 + 7 * 1000 + 8
            );
        });
    });

    describe("toString", () => {
        it("should return the formatted duration", () => {
            const duration = new Duration({
                years: 1,
                months: 2,
                weeks: 3,
                days: 4,
                hours: 5,
                minutes: 6,
                seconds: 7,
                milliseconds: 8
            });
            expect(duration.toString()).toBe(
                "1 year 2 months 3 weeks 4 days 5 hours 6 minutes 7 seconds 8 milliseconds"
            );
        });

        it("should return the formatted duration with only the given fields", () => {
            const duration = new Duration({
                years: 1,
                days: 4,
                hours: 5,
                minutes: 6,
                seconds: 7,
                milliseconds: 8
            });
            expect(duration.toString()).toBe("1 year 4 days 5 hours 6 minutes 7 seconds 8 milliseconds");
        });
    });

    describe("toPrimitive", () => {
        it("should return the duration as a string", () => {
            const duration = new Duration({
                years: 1,
                months: 2,
                weeks: 3,
                days: 4,
                hours: 5,
                minutes: 6,
                seconds: 7,
                milliseconds: 8
            });

            expect(String(duration)).toBe("1 year 2 months 3 weeks 4 days 5 hours 6 minutes 7 seconds 8 milliseconds");
        });

        it("should return the duration as a number", () => {
            const duration = new Duration({
                years: 1,
                months: 2,
                weeks: 3,
                days: 4,
                hours: 5,
                minutes: 6,
                seconds: 7,
                milliseconds: 8
            });

            expect(+duration).toBe(
                1 * 31536000000 + 2 * 2592000000 + 3 * 604800000 + 4 * 86400000 + 5 * 3600000 + 6 * 60000 + 7 * 1000 + 8
            );
        });
    });

    describe("toMilliseconds", () => {
        it("should return the total duration in milliseconds", () => {
            const duration = new Duration({
                years: 1,
                months: 2,
                weeks: 3,
                days: 4,
                hours: 5,
                minutes: 6,
                seconds: 7,
                milliseconds: 8
            });

            expect(duration.toMilliseconds()).toBe(
                1 * 31536000000 + 2 * 2592000000 + 3 * 604800000 + 4 * 86400000 + 5 * 3600000 + 6 * 60000 + 7 * 1000 + 8
            );
        });
    });

    describe("fromDurationStringExpression", () => {
        it("should return the duration in milliseconds", () => {
            expect(Duration.fromDurationStringExpression("1 y", true)).toBe(31536000000);
            expect(Duration.fromDurationStringExpression("1 mo", true)).toBe(2592000000);
            expect(Duration.fromDurationStringExpression("1 w", true)).toBe(604800000);
            expect(Duration.fromDurationStringExpression("1 d", true)).toBe(86400000);
            expect(Duration.fromDurationStringExpression("1 h", true)).toBe(3600000);
            expect(Duration.fromDurationStringExpression("1 m", true)).toBe(60000);
            expect(Duration.fromDurationStringExpression("1 s", true)).toBe(1000);
            expect(Duration.fromDurationStringExpression("1 ms", true)).toBe(1);
        });

        it("should return the duration", () => {
            expect(Duration.fromDurationStringExpression("1y4month2d6h20minutes")).toEqual(
                new Duration({
                    years: 1,
                    months: 4,
                    weeks: 0,
                    days: 2,
                    hours: 6,
                    minutes: 20,
                    seconds: 0,
                    milliseconds: 0
                })
            );
        });
    });

    describe("fromMilliseconds", () => {
        it("should create a Duration object from milliseconds correctly", () => {
            const timestamp1 = Date.now();
            const timestamp2 = timestamp1 + 5000;
            const duration = Duration.fromMilliseconds(timestamp2 - timestamp1);
            expect(duration.toString()).toBe("5 seconds");
        });

        it("should correctly pluralize units when needed", () => {
            const duration1 = Duration.fromMilliseconds(1);
            const duration2 = Duration.fromMilliseconds(2);
            expect(duration1.toString()).toBe("1 millisecond");
            expect(duration2.toString()).toBe("2 milliseconds");
        });
    });
});
