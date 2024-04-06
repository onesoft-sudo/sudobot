export enum CachingMode {
    None = "None",
    Incremental = "Incremental"
}

export function Caching(mode: CachingMode) {
    return (target: object, key?: unknown) => {
        const existing = Reflect.getMetadata("task:caching", target) ?? {};
        existing[key === undefined ? "execute" : String(key)] = mode;
        Reflect.defineMetadata("task:caching", existing, target);
    };
}
