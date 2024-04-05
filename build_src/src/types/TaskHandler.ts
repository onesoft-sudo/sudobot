import AbstractTask, { TaskFunction } from "../core/AbstractTask";

export type TaskHandler<T extends typeof AbstractTask<object> = typeof AbstractTask<object>> =
    | TaskFunction
    | T;
