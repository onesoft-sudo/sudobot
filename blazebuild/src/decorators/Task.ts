export type TaskOptions = {
    name?: string;
    noPrefix?: boolean;
    defaultGroup?: string;
    defaultDescription?: string;
    defaultHidden?: boolean;
};

export type TaskMetadata = TaskOptions & {
    key: string;
    name: string;
};

export const Task = (options?: TaskOptions) => {
    return (target: object, key: unknown) => {
        const taskNames = Reflect.getMetadata("task:data", target) ?? [];

        taskNames.push({
            key,
            ...options
        });

        Reflect.defineMetadata("task:data", taskNames, target);
    };
};
