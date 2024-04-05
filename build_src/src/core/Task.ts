import { Awaitable } from "../types/Awaitable";
import { AbstractTaskClass } from "./AbstractTask";
import type BlazeBuild from "./BlazeBuild";

export type TaskRegisterOptions<T extends AbstractTaskClass<object> = AbstractTaskClass<object>> = {
    doLast?: (this: T) => Awaitable<void>;
    doFirst?: (this: T) => Awaitable<void>;
    dependencies?: string[];
    condition?: (this: T) => Awaitable<boolean>;
};

export type TaskResolvable = string | AbstractTaskClass<object>;

export interface Task {
    name: string;
    dependsOn: string[];
    handler: AbstractTaskClass<object>;
    onlyIf?: (cli: BlazeBuild) => Awaitable<boolean>;
    options?: TaskRegisterOptions;
}
