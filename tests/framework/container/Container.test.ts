import "reflect-metadata";

import Container from "@framework/container/Container";
import crypto from "crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("container bindings", () => {
    let container: Container;

    beforeEach(() => {
        container = Container.getInstance();
    });

    afterEach(() => {
        Container.destroyGlobalContainer();
    });

    it("should bind and resolve a class instance", () => {
        class MyClass {}

        container.bind(MyClass);
        const instance = container.resolveByClass(MyClass);

        expect(instance).toBeInstanceOf(MyClass);
    });

    it("should bind and resolve a singleton class instance", () => {
        class MyClass {}

        container.bind(MyClass, { singleton: true });
        const instance1 = container.resolveByClass(MyClass);
        const instance2 = container.resolveByClass(MyClass);

        expect(instance1).toBeInstanceOf(MyClass);
        expect(instance2).toBe(instance1);
    });

    it("should bind and resolve a class instance with a custom key", () => {
        class MyClass {}

        container.bind(MyClass, { key: "myClass", singleton: true });

        const instance = container.resolve("myClass");
        expect(instance).toBeInstanceOf(MyClass);

        const instance2 = container.resolveByClass(MyClass);
        expect(instance2).toBeInstanceOf(MyClass);

        expect(instance2).toBe(instance);
    });

    it("should implicitly resolve a class instance if not bound", () => {
        class MyClass {}

        const instance = container.resolveByClass(MyClass);
        expect(instance).toBeInstanceOf(MyClass);
    });
});

describe("container bindings with dependencies", () => {
    let container: Container;

    beforeEach(() => {
        container = Container.getInstance();
    });

    afterEach(() => {
        Container.destroyGlobalContainer();
    });

    it("should bind and resolve a class instance with dependencies", () => {
        class MyClass {}

        class MyDependentClass {
            public constructor(public myClass: MyClass) {}
        }

        Reflect.defineMetadata("design:paramtypes", [MyClass], MyDependentClass);

        container.bind(MyClass);
        container.bind(MyDependentClass);

        const instance = container.resolveByClass(MyDependentClass);

        expect(instance).toBeInstanceOf(MyDependentClass);
        expect(instance.myClass).toBeInstanceOf(MyClass);
    });

    it("should bind and resolve a class instance with singleton dependencies", () => {
        class MyClass {}
        class MyClass2 {}

        class MyDependentClass {
            public constructor(
                public myClass: MyClass,
                public myClass2: MyClass2
            ) {}
        }

        Reflect.defineMetadata("design:paramtypes", [MyClass, MyClass2], MyDependentClass);

        container.bind(MyClass, { singleton: true });
        container.bind(MyClass2, { singleton: true });
        container.bind(MyDependentClass, { singleton: true });

        const instance1 = container.resolveByClass(MyDependentClass);
        const instance2 = container.resolveByClass(MyDependentClass);

        expect(instance1).toBeInstanceOf(MyDependentClass);
        expect(instance2).toBe(instance1);
        expect(instance1.myClass).toBeInstanceOf(MyClass);
        expect(instance2.myClass).toBe(instance1.myClass);
        expect(instance1.myClass2).toBeInstanceOf(MyClass2);
        expect(instance2.myClass2).toBe(instance1.myClass2);
    });

    it("should bind and resolve a class instance with deep and circular dependencies", () => {
        class Level0Dep0 {}
        class Level0Dep1 {}

        class Level1Dep0 {
            public constructor(public level0Dep0: Level0Dep0) {}
        }

        Reflect.defineMetadata("design:paramtypes", [Level0Dep0], Level1Dep0);

        class Level1Dep1 {
            public constructor(
                public level0Dep0: Level0Dep0,
                public level0Dep1: Level0Dep1
            ) {}
        }

        Reflect.defineMetadata("design:paramtypes", [Level0Dep0, Level0Dep1], Level1Dep1);

        class Level2Dep0 {
            public constructor(
                public level1Dep0: Level1Dep0,
                public level0Dep1: Level0Dep1
            ) {}
        }

        Reflect.defineMetadata("design:paramtypes", [Level1Dep0, Level0Dep1], Level2Dep0);

        class Level2Dep1 {
            public constructor(
                public level1Dep0: Level1Dep0,
                public level0Dep0: Level0Dep0,
                public level1Dep1: Level1Dep1
            ) {}
        }

        Reflect.defineMetadata(
            "design:paramtypes",
            [Level1Dep0, Level0Dep0, Level1Dep1],
            Level2Dep1
        );

        class Application {
            public constructor(
                public level2Dep1: Level2Dep1,
                public level2Dep0: Level2Dep0
            ) {}
        }

        Reflect.defineMetadata("design:paramtypes", [Level2Dep1, Level2Dep0], Application);

        container.bind(Level0Dep0, { singleton: true });
        container.bind(Level0Dep1, { singleton: true });
        container.bind(Level1Dep0, { singleton: true });
        container.bind(Level1Dep1, { singleton: true });
        container.bind(Level2Dep0, { singleton: true });
        container.bind(Level2Dep1, { singleton: true });
        container.bind(Application);

        const instance = container.resolveByClass(Application);

        expect(instance).toBeInstanceOf(Application);

        expect(instance.level2Dep0).toBeInstanceOf(Level2Dep0);
        expect(instance.level2Dep1).toBeInstanceOf(Level2Dep1);

        expect(instance.level2Dep0.level1Dep0).toBeInstanceOf(Level1Dep0);
        expect(instance.level2Dep0.level0Dep1).toBeInstanceOf(Level0Dep1);

        expect(instance.level2Dep1.level1Dep0).toBeInstanceOf(Level1Dep0);
        expect(instance.level2Dep1.level0Dep0).toBeInstanceOf(Level0Dep0);
        expect(instance.level2Dep1.level1Dep1).toBeInstanceOf(Level1Dep1);

        expect(instance.level2Dep1.level1Dep1.level0Dep0).toBeInstanceOf(Level0Dep0);
        expect(instance.level2Dep1.level1Dep1.level0Dep1).toBeInstanceOf(Level0Dep1);

        expect(instance.level2Dep1.level1Dep1.level0Dep0).toBe(
            instance.level2Dep0.level1Dep0.level0Dep0
        );
        expect(instance.level2Dep1.level1Dep1.level0Dep1).toBe(instance.level2Dep0.level0Dep1);

        expect(instance.level2Dep0.level1Dep0.level0Dep0).toBe(
            instance.level2Dep1.level1Dep0.level0Dep0
        );
        expect(instance.level2Dep0.level0Dep1).toBe(instance.level2Dep1.level1Dep1.level0Dep1);

        expect(instance.level2Dep1.level1Dep0.level0Dep0).toBe(
            instance.level2Dep0.level1Dep0.level0Dep0
        );
        expect(instance.level2Dep1.level1Dep1.level0Dep1).toBe(instance.level2Dep0.level0Dep1);

        expect(instance.level2Dep1.level1Dep0.level0Dep0).toBe(
            instance.level2Dep0.level1Dep0.level0Dep0
        );
        expect(instance.level2Dep1.level1Dep1.level0Dep1).toBe(instance.level2Dep0.level0Dep1);
    });
});

describe("container bindings with factories", () => {
    let container: Container;

    beforeEach(() => {
        container = Container.getInstance();
    });

    afterEach(() => {
        Container.destroyGlobalContainer();
    });

    it("should bind and resolve a class instance with a factory", async () => {
        class MyClass {
            public constructor(public value: number) {}
        }

        await container.bind(MyClass, {
            factory: () => new MyClass(crypto.getRandomValues(new Uint32Array(1))[0])
        });

        const instance = container.resolveByClass(MyClass);
        const instance2 = container.resolveByClass(MyClass);

        expect(instance).toBeInstanceOf(MyClass);
        expect(instance2).toBeInstanceOf(MyClass);
        expect(instance2).not.toBe(instance);
        expect(instance.value).not.toBe(instance2.value);
    });

    it("should bind and resolve a singleton class instance with a factory", () => {
        class MyClass {
            public constructor(public value: number) {}
        }

        container.bind(MyClass, {
            factory: () => new MyClass(Math.ceil(Math.random() * 100)),
            singleton: true
        });

        const instance = container.resolveByClass(MyClass);
        const instance2 = container.resolveByClass(MyClass);

        expect(instance).toBeInstanceOf(MyClass);
        expect(instance2).toBeInstanceOf(MyClass);
        expect(instance2).toBe(instance);
        expect(instance.value).toBe(instance2.value);
    });
});

describe("global containers", () => {
    it("should return the same container instance", () => {
        const container1 = Container.getInstance();
        const container2 = Container.getInstance();

        expect(container2).toBe(container1);
    });

    it("should destroy the global container instance", () => {
        const container1 = Container.getInstance();
        Container.destroyGlobalContainer();
        const container2 = Container.getInstance();

        expect(container2).not.toBe(container1);
    });
});

describe("container property injection", () => {
    let container: Container;

    beforeEach(() => {
        container = Container.getInstance();
    });

    afterEach(() => {
        Container.destroyGlobalContainer();
    });

    it("should inject a class instance with properties", () => {
        class MyClass {
            public value = 42;
        }

        class MyDependentClass {
            @Container.Inject()
            public myClass!: MyClass;
        }

        Reflect.defineMetadata("design:type", MyClass, MyDependentClass.prototype, "myClass");

        container.bind(MyClass, { singleton: true });
        container.bind(MyDependentClass, { singleton: true });

        const instance = container.resolveByClass(MyDependentClass);

        expect(instance).toBeInstanceOf(MyDependentClass);
        expect(instance.myClass).toBeInstanceOf(MyClass);
        expect(instance.myClass.value).toBe(42);

        const instance2 = container.resolveByClass(MyDependentClass);

        expect(instance2).toBe(instance);
        expect(instance2.myClass).toBe(instance.myClass);
        expect(instance2.myClass.value).toBe(instance.myClass.value);

        instance.myClass.value = 100;

        expect(instance2.myClass.value).toBe(100);
    });

    it("should inject a class instance with properties and singleton dependencies", () => {
        class MyClass {
            public value = 42;
        }

        class MyDependentClass {
            @Container.Inject()
            public myClass!: MyClass;
        }

        Reflect.defineMetadata("design:type", MyClass, MyDependentClass.prototype, "myClass");

        container.bind(MyClass, { singleton: true });
        container.bind(MyDependentClass, { singleton: true });

        const instance = container.resolveByClass(MyDependentClass);

        expect(instance).toBeInstanceOf(MyDependentClass);
        expect(instance.myClass).toBeInstanceOf(MyClass);
        expect(instance.myClass.value).toBe(42);

        const instance2 = container.resolveByClass(MyDependentClass);

        expect(instance2).toBe(instance);
        expect(instance2.myClass).toBe(instance.myClass);
        expect(instance2.myClass.value).toBe(instance.myClass.value);

        instance.myClass.value = 100;

        expect(instance2.myClass.value).toBe(100);
    });
});
