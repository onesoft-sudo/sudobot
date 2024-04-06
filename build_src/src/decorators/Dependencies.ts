import { TaskResolvable } from "../core/Task";

export const Dependencies = (...dependencies: TaskResolvable[]): MethodDecorator => {
    return (target, key) => {
        const existing = Reflect.getMetadata("task:dependencies", target) ?? {};
        existing[key] = dependencies;
        Reflect.defineMetadata("task:dependencies", existing, target);
    };
};
