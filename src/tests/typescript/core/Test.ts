export function TestCase(target: object, key: PropertyKey): void;
export function TestCase(name: string): (target: object, key: PropertyKey) => void;

export function TestCase(target: object | string, key?: PropertyKey) {
    if (typeof target === "string") {
        const name = target;
        return (target: object, key: PropertyKey) => {
            const metadata = Reflect.getMetadata("test:cases", target) || new Map();
            metadata.set(key, { name });
            Reflect.defineMetadata("test:cases", metadata, target);
        };
    }

    const metadata = Reflect.getMetadata("test:cases", target) || new Map();
    metadata.set(key, {});
    Reflect.defineMetadata("test:cases", metadata, target);
}

export function BeforeEach(target: object, key?: PropertyKey) {
    const metadata = Reflect.getMetadata("test:beforeEach", target) || new Set();
    metadata.add(key);
    Reflect.defineMetadata("test:beforeEach", metadata, target);
}

export function BeforeAll(target: object, key?: PropertyKey) {
    const metadata = Reflect.getMetadata("test:beforeAll", target) || new Set();
    metadata.add(key);
    Reflect.defineMetadata("test:beforeAll", metadata, target);
}

export function AfterEach(target: object, key?: PropertyKey) {
    const metadata = Reflect.getMetadata("test:afterEach", target) || new Set();
    metadata.add(key);
    Reflect.defineMetadata("test:afterEach", metadata, target);
}

export function AfterAll(target: object, key?: PropertyKey) {
    const metadata = Reflect.getMetadata("test:afterAll", target) || new Set();
    metadata.add(key);
    Reflect.defineMetadata("test:afterAll", metadata, target);
}
