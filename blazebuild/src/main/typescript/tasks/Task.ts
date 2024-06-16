import type AbstractTask from "./AbstractTask";
import type { TaskRegisterOptions } from "./TaskManager";

export type TaskBaseDetails<R> = Pick<
    TaskRegisterOptions<R>,
    "name" | "description" | "hidden" | "group"
>;

export function Task<R>(target: typeof AbstractTask<R>): void;
export function Task<R>(details: TaskBaseDetails<R>): ClassDecorator;

export function Task<R>(targetOrDetails: typeof AbstractTask<R> | TaskBaseDetails<R>) {
    if (typeof targetOrDetails === "function") {
        Reflect.defineMetadata("task:details", {}, targetOrDetails);
        return;
    }

    return (target: typeof AbstractTask) => {
        const details = targetOrDetails as TaskBaseDetails<R>;
        Reflect.defineMetadata("task:details", details, target);
    };
}
