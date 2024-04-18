import { TaskResolvable } from "../core/Task";

export const Dependencies = (...dependencies: TaskResolvable[]) => {
    return (target: object, key: unknown) => {
        const existing = Reflect.getMetadata("task:dependencies", target) ?? {};
        existing[key as string] = dependencies;
        Reflect.defineMetadata("task:dependencies", existing, target);
    };
};
