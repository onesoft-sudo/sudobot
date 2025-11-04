import {
    Inject,
    INJECT_SYMBOL_CONSTRUCT,
    INJECT_SYMBOL_FIELD,
    INJECT_SYMBOL_LIST,
    INJECT_SYMBOL_METHOD
} from "@framework/container/Inject";
import { describe, expect, it } from "vitest";

describe("Inject", () => {
    describe("with class fields", () => {
        it("can infer property types that are available in runtime", () => {
            class DependencyObject {}
            class OtherObject {
                @Inject()
                public something!: DependencyObject;
            }

            const otherObject = new OtherObject();

            expect(Reflect.getMetadata(INJECT_SYMBOL_LIST, otherObject)).toEqual(new Set(["something"]));
            expect(Reflect.getMetadata(INJECT_SYMBOL_FIELD, otherObject, "something")?.type).toBe(DependencyObject);
        });

        it("can work with multiple annotated properties work seamlessly", () => {
            class DependencyObject {}
            class DependencyObject2 {}
            class OtherObject {
                @Inject()
                public something!: DependencyObject;

                @Inject()
                public anotherThing!: DependencyObject;

                @Inject()
                public anotherThing2!: DependencyObject2;

                public nothing!: DependencyObject2;
            }

            const otherObject = new OtherObject();

            expect(Reflect.getMetadata(INJECT_SYMBOL_LIST, otherObject)).toEqual(
                new Set(["something", "anotherThing", "anotherThing2"])
            );

            expect(Reflect.getMetadata(INJECT_SYMBOL_FIELD, otherObject, "something")?.type).toBe(DependencyObject);
            expect(Reflect.getMetadata(INJECT_SYMBOL_FIELD, otherObject, "anotherThing")?.type).toBe(DependencyObject);
            expect(Reflect.getMetadata(INJECT_SYMBOL_FIELD, otherObject, "anotherThing2")?.type).toBe(
                DependencyObject2
            );
            expect(Reflect.getMetadata(INJECT_SYMBOL_FIELD, otherObject, "nothing")).toBe(undefined);
        });
    });

    describe("with class methods", () => {
        it("can infer method parameter types", () => {
            class DependencyObject {}
            class OtherObject {
                public someMethod(_arg1: string, @Inject() _arg2: DependencyObject) {}
            }

            const otherObject = new OtherObject();

            expect(Reflect.getMetadata(INJECT_SYMBOL_LIST, otherObject)).toEqual(new Set([]));
            expect(Reflect.getMetadata(INJECT_SYMBOL_METHOD, otherObject, "someMethod")).toEqual(
                new Map([[1, { type: DependencyObject }]])
            );
        });

        it("can work with with multiple annotated method parameters", () => {
            class DependencyObject {}
            class DependencyObject2 {}
            class OtherObject {
                public someMethod(
                    _arg1: string,
                    @Inject() _arg2: DependencyObject,
                    @Inject() _arg3: DependencyObject2
                ) {}

                public someMethod2(@Inject() _arg1: DependencyObject) {}

                public someMethod3(_nothing: string) {}
            }

            const otherObject = new OtherObject();

            expect(Reflect.getMetadata(INJECT_SYMBOL_LIST, otherObject)).toEqual(new Set([]));
            expect(Reflect.getMetadata(INJECT_SYMBOL_METHOD, otherObject, "someMethod")).toEqual(
                new Map([
                    [1, { type: DependencyObject }],
                    [2, { type: DependencyObject2 }]
                ])
            );
            expect(Reflect.getMetadata(INJECT_SYMBOL_METHOD, otherObject, "someMethod2")).toEqual(
                new Map([[0, { type: DependencyObject }]])
            );
        });

        it("can work with constructor functions", () => {
            class DependencyObject {}
            class DependencyObject2 {}
            class OtherObject {
                public constructor(
                    @Inject() _arg1: DependencyObject,
                    _arg2: string,
                    @Inject() _arg3: DependencyObject2
                ) {}
            }

            const otherObject = new OtherObject(new DependencyObject(), "", new DependencyObject2());

            expect(Reflect.getMetadata(INJECT_SYMBOL_LIST, otherObject)).toBeUndefined();
            expect(Reflect.getMetadata(INJECT_SYMBOL_LIST, otherObject.constructor)).toEqual(new Set(["constructor"]));

            expect(Reflect.getMetadata(INJECT_SYMBOL_CONSTRUCT, otherObject)).toBeUndefined();
            expect(Reflect.getMetadata(INJECT_SYMBOL_CONSTRUCT, otherObject.constructor)).toEqual(
                new Map([
                    [0, { type: DependencyObject }],
                    [2, { type: DependencyObject2 }]
                ])
            );
        });
    });
});
