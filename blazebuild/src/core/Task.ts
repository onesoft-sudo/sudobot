import { Awaitable } from "../types/Awaitable";
import { AbstractTaskClass } from "./AbstractTask";

export type TaskRegisterOptions<T extends AbstractTaskClass<object> = AbstractTaskClass<object>> = {
    doLast?: (this: T) => Awaitable<void>;
    doFirst?: (this: T) => Awaitable<void>;
    dependencies?: string[];
};

export type TaskResolvable = string | typeof AbstractTaskClass<object>;

export interface Task {
    name: string;
    handler: AbstractTaskClass<object>;
    options?: TaskRegisterOptions;
}
