import { TaskFunction } from "../core/AbstractTask";

export type TaskOptions = {
    name?: string;
    noPrefix?: boolean;
};

export type TaskMetadata = TaskOptions & { key: string; name: string };

export const Task = (options?: TaskOptions) => {
    type Target<K extends string> = {
        [key in NoInfer<K>]: TaskFunction;
    };

    return <K extends string>(target: Target<K>, key: K) => {
        const taskNames = Reflect.getMetadata("task:names", target) ?? [];

        taskNames.push({
            key,
            ...options
        });

        Reflect.defineMetadata("task:names", taskNames, target);
    };
};
