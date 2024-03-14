import "reflect-metadata";
import { beforeEach, describe, expect, it } from "vitest";
import CanBind from "../../src/components/container/CanBind";
import Container from "../../src/components/container/Container";

describe("container bindings", () => {
    let container: Container;

    beforeEach(() => {
        container = new Container();
    });

    it("should bind and resolve a class instance", async () => {
        class MyClass {}

        await container.bind(MyClass);
        const instance = await container.resolve(MyClass);

        expect(instance).toBeInstanceOf(MyClass);
    });

    it("should bind and resolve a singleton class instance", async () => {
        class MyClass {}

        await container.bind(MyClass, { singleton: true });
        const instance1 = await container.resolve(MyClass);
        const instance2 = await container.resolve(MyClass);

        expect(instance1).toBeInstanceOf(MyClass);
        expect(instance2).toBe(instance1);
    });

    it("should throw an error when resolving an unbound class", async () => {
        class MyClass {}

        expect(container.resolve(MyClass)).rejects.toEqual(
            new Error('Failed to resolve binding for "MyClass"')
        );
    });
});

describe("container bindings with dependencies", () => {
    let container: Container;

    beforeEach(() => {
        container = new Container();
    });

    it("should bind and resolve a class instance with dependencies", async () => {
        class MyClass {}

        class MyDependentClass {
            public constructor(public myClass: MyClass) {}
        }

        CanBind(MyDependentClass);
        Reflect.defineMetadata("design:paramtypes", [MyClass], MyDependentClass);

        await container.bind(MyClass);
        await container.bind(MyDependentClass);

        const instance = await container.resolve(MyDependentClass);

        expect(instance).toBeInstanceOf(MyDependentClass);
        expect(instance.myClass).toBeInstanceOf(MyClass);
    });

    it("should bind and resolve a class instance with singleton dependencies", async () => {
        class MyClass {}
        class MyClass2 {}

        class MyDependentClass {
            public constructor(public myClass: MyClass, public myClass2: MyClass2) {}
        }

        CanBind(MyDependentClass);
        Reflect.defineMetadata("design:paramtypes", [MyClass, MyClass2], MyDependentClass);

        await container.bind(MyClass, { singleton: true });
        await container.bind(MyClass2, { singleton: true });
        await container.bind(MyDependentClass, { singleton: true });

        const instance1 = await container.resolve(MyDependentClass);
        const instance2 = await container.resolve(MyDependentClass);

        expect(instance1).toBeInstanceOf(MyDependentClass);
        expect(instance2).toBe(instance1);
        expect(instance1.myClass).toBeInstanceOf(MyClass);
        expect(instance2.myClass).toBe(instance1.myClass);
        expect(instance1.myClass2).toBeInstanceOf(MyClass2);
        expect(instance2.myClass2).toBe(instance1.myClass2);
    });

    it("should bind and resolve a class instance with deep and circular dependencies", async () => {
        class Level0Dep0 {}
        class Level0Dep1 {}

        class Level1Dep0 {
            public constructor(public level0Dep0: Level0Dep0) {}
        }

        Reflect.defineMetadata("design:paramtypes", [Level0Dep0], Level1Dep0);

        class Level1Dep1 {
            public constructor(public level0Dep0: Level0Dep0, public level0Dep1: Level0Dep1) {}
        }

        Reflect.defineMetadata("design:paramtypes", [Level0Dep0, Level0Dep1], Level1Dep1);

        class Level2Dep0 {
            public constructor(public level1Dep0: Level1Dep0, public level0Dep1: Level0Dep1) {}
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
            public constructor(public level2Dep1: Level2Dep1, public level2Dep0: Level2Dep0) {}
        }

        Reflect.defineMetadata("design:paramtypes", [Level2Dep1, Level2Dep0], Application);

        await container.bind(Level0Dep0, { singleton: true });
        await container.bind(Level0Dep1, { singleton: true });
        await container.bind(Level1Dep0, { singleton: true });
        await container.bind(Level1Dep1, { singleton: true });
        await container.bind(Level2Dep0, { singleton: true });
        await container.bind(Level2Dep1, { singleton: true });
        await container.bind(Application);

        const instance = await container.resolve(Application);

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
        container = new Container();
    });

    it("should bind and resolve a class instance with a factory", async () => {
        class MyClass {
            public constructor(public value: number) {}
        }

        await container.bind(MyClass, {
            factory: async () => new MyClass(crypto.getRandomValues(new Uint32Array(1))[0])
        });

        const instance = await container.resolve(MyClass);
        const instance2 = await container.resolve(MyClass);

        expect(instance).toBeInstanceOf(MyClass);
        expect(instance2).toBeInstanceOf(MyClass);
        expect(instance2).not.toBe(instance);
        expect(instance.value).not.toBe(instance2.value);
    });

    it("should bind and resolve a singleton class instance with a factory", async () => {
        class MyClass {
            public constructor(public value: number) {}
        }

        await container.bind(MyClass, {
            factory: async () => new MyClass(Math.ceil(Math.random() * 100)),
            singleton: true
        });

        const instance = await container.resolve(MyClass);
        const instance2 = await container.resolve(MyClass);

        expect(instance).toBeInstanceOf(MyClass);
        expect(instance2).toBeInstanceOf(MyClass);
        expect(instance2).toBe(instance);
        expect(instance.value).toBe(instance2.value);
    });
});

describe("global containers", () => {
    beforeEach(() => {
        Container.destroyGlobalContainer();
    });

    it("should set the first container as the global container", () => {
        Container.setFirstContainerAsGlobal();
        const container = new Container();
        expect(Container.getGlobalContainer()).toBe(container);
    });

    it("should throw an error when trying to get the global container without setting it first", () => {
        expect(() => Container.getGlobalContainer()).toThrowError(
            "Global container has not been set yet"
        );
    });

    it("should set a custom global container", () => {
        const container = new Container();
        Container.getGlobalContainerResolver(() => container);
        expect(Container.getGlobalContainer()).toBe(container);
    });
});
