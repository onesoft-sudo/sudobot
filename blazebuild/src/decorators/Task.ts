export type TaskOptions = {
    name?: string;
    noPrefix?: boolean;
};

export type TaskMetadata = TaskOptions & { key: string; name: string };

export const Task = (options?: TaskOptions) => {
    return (target: object, key: unknown) => {
        const taskNames = Reflect.getMetadata("task:names", target) ?? [];

        taskNames.push({
            key,
            ...options
        });

        Reflect.defineMetadata("task:names", taskNames, target);
    };
};
