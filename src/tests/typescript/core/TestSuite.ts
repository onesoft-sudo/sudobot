import "reflect-metadata";

import { describe, test } from "bun:test";

function executeSuite(suite: object, name?: string) {
    describe(name ?? suite.constructor.name, () => {
        const tests = Reflect.getMetadata("test:cases", suite) || new Map();

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
            setImmediate(() => {
                const object = new (target as new () => object)();
                executeSuite(object, name);
            });
        };
    }

    setImmediate(() => {
        const object = new (target as new () => object)();
        executeSuite(object);
    });
}
