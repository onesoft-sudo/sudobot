import type BlazeBuild from "../core/BlazeBuild";
import type AbstractTask from "../tasks/AbstractTask";
import type { Awaitable } from "../types/Awaitable";

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
