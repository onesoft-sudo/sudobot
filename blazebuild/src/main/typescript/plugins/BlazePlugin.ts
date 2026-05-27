import type BlazeBuild from "../core/BlazeBuild.ts";
import type AbstractTask from "../tasks/AbstractTask.ts";
import type { Awaitable } from "../types/Awaitable.ts";

abstract class BlazePlugin {
    protected readonly blaze: BlazeBuild;

    public constructor(blaze: BlazeBuild) {
        this.blaze = blaze;
    }

    public boot(): Awaitable<void> {}

    public tasks(): Awaitable<(typeof AbstractTask)[]> {
        return [];
    }
}

export default BlazePlugin;
