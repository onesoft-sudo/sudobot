export enum CachingMode {
    None = "None",
    Incremental = "Incremental"
}

export function Caching(mode: CachingMode): ClassDecorator {
    return target => {
        Reflect.defineMetadata("task:caching", mode, target);
    };
}
