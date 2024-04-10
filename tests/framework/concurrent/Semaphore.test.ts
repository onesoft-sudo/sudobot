import { setTimeout } from "timers/promises";
import { describe, expect, it } from "vitest";
import Semaphore from "../../../src/framework/concurrent/Semaphore";

describe("Semaphore", () => {
    describe("basic usage", () => {
        it("can be acquired and released", async () => {
            // Arrange
            const semaphore = new Semaphore(1);

            // Act
            await semaphore.acquire();
            semaphore.release();

            // Assert
            expect(semaphore.availablePermits).toBe(1);
        });

        it("can be acquired and released with extraneous releases", async () => {
            // Arrange
            const semaphore = new Semaphore({
                ignoreExtraneousReleases: true,
                maxPermits: 1
            });

            // Act
            await semaphore.acquire();
            const permitsAfterAcquire = semaphore.availablePermits;
            semaphore.release();

            // Assert
            expect(semaphore.availablePermits).toBe(1);
            expect(permitsAfterAcquire).toBe(0);
        });

        it("can be acquired and released with extraneous releases and ignore them", async () => {
            // Arrange
            const semaphore = new Semaphore({
                ignoreExtraneousReleases: true,
                maxPermits: 1
            });

            // Act
            await semaphore.acquire();
            const permitsAfterAcquire = semaphore.availablePermits;
            semaphore.release();
            const permitsAfterFirstRelease = semaphore.availablePermits;
            semaphore.release();

            // Assert
            expect(semaphore.availablePermits).toBe(1);
            expect(permitsAfterFirstRelease).toBe(1);
            expect(permitsAfterAcquire).toBe(0);
        });

        it("can be acquired with extraneous releases and throws an error if opted-in", async () => {
            // Arrange
            const semaphore = new Semaphore({
                ignoreExtraneousReleases: false,
                maxPermits: 1
            });

            // Act
            await semaphore.acquire();
            semaphore.release();

            // Assert
            expect(() => semaphore.release()).toThrowError(
                Semaphore.EXTRANEOUS_RELEASE_ERROR_MESSAGE
            );
        });
    });

    describe("race condition checks", () => {
        it(
            "can be acquired and released with multiple acquires",
            {
                repeats: 10
            },
            async () => {
                // Arrange
                const semaphore = new Semaphore(1);
                const output: number[] = [];
                const fn1 = async () => {
                    await semaphore.acquire();
                    await setTimeout(700 * Math.random());
                    output.push(1);
                    semaphore.release();
                };

                const fn2 = async () => {
                    await semaphore.acquire();
                    await setTimeout(240 * Math.random());
                    output.push(2);
                    semaphore.release();
                };

                // Act
                await Promise.all([fn1(), fn2(), fn2(), fn1(), fn1()]);

                // Assert
                expect(semaphore.availablePermits).toBe(1);
                expect(output).toStrictEqual([1, 2, 2, 1, 1]);
            }
        );
    });
});
