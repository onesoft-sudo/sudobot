import type { TaskOptions } from "../tasks/TaskControl";

type TaskDecoratorOptions = Partial<
    Omit<TaskOptions, "handler" | "inputFiles" | "outputFiles">
>;

export const Task = (options: TaskDecoratorOptions): ClassDecorator => {
    return (target: Function) => {
        Reflect.defineMetadata("task:options", options, target.prototype);
    };
};
