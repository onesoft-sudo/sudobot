import type BlazeBuild from "../core/BlazeBuild";
import type { Awaitable } from "../types/Awaitable";
import type TaskContext from "./TaskContext";

abstract class AbstractTask {
    protected readonly blaze: BlazeBuild;

    public constructor(blaze: BlazeBuild) {
        this.blaze = blaze;
    }

    protected run(context: TaskContext): Awaitable<void> {}

    protected dependencies(): Awaitable<string[]> {
        return [];
    }

    protected generateInput(): Awaitable<string[]> {
        return [];
    }

    protected generateOutput(): Awaitable<string[]> {
        return [];
    }
}

export default AbstractTask;
