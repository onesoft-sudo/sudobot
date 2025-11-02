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
