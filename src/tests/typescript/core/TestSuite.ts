import "reflect-metadata";

import { afterAll, afterEach, beforeAll, beforeEach, describe, test, type TestContext as ViTestContext } from "vitest";

function executeSuite(suite: object, name?: string) {
    describe(name ?? suite.constructor.name, () => {
        const tests = Reflect.getMetadata("test:cases", suite) || new Map();
        const beforeAllFns = Reflect.getMetadata("test:beforeAll", suite) || new Set<PropertyKey>();
        const beforeEachFns = Reflect.getMetadata("test:beforeEach", suite) || new Set<PropertyKey>();
        const afterAllFns = Reflect.getMetadata("test:afterAll", suite) || new Set<PropertyKey>();
        const afterEachFns = Reflect.getMetadata("test:afterEach", suite) || new Set<PropertyKey>();

        for (const key of beforeAllFns) {
            if (key in suite && typeof suite[key as keyof typeof suite] === "function") {
                const fn = suite[key as keyof typeof suite] as () => void;
                beforeAll(fn.bind(suite));
            }
        }

        for (const key of beforeEachFns) {
            if (key in suite && typeof suite[key as keyof typeof suite] === "function") {
                const fn = suite[key as keyof typeof suite] as () => void;
                beforeEach(fn.bind(suite));
            }
        }

        for (const key of afterAllFns) {
            if (key in suite && typeof suite[key as keyof typeof suite] === "function") {
                const fn = suite[key as keyof typeof suite] as () => void;
                afterAll(fn.bind(suite));
            }
        }

        for (const key of afterEachFns) {
            if (key in suite && typeof suite[key as keyof typeof suite] === "function") {
                const fn = suite[key as keyof typeof suite] as () => void;
                afterEach(fn.bind(suite));
            }
        }

        for (const [key, options] of tests) {
            if (key in suite && typeof suite[key as keyof typeof suite] === "function") {
                const fn = suite[key as keyof typeof suite] as () => void;
                test(options.name ?? key, fn.bind(suite));
            }
        }
    });
}

export function TestSuite(target: object): void;
export function TestSuite(target: string): (target: object) => void;

export function TestSuite(target: object | string) {
    if (typeof target === "string") {
        const name = target;

        return (target: object) => {
            const object = new (target as new () => object)();
            executeSuite(object, name);
        };
    }

    process.on("beforeExit", () => {
        console.log(3);
    });

    const object = new (target as new () => object)();
    executeSuite(object);
}

export type TestContext = ViTestContext;
