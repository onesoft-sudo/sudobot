import type Blaze from "../core/Blaze";
import type AbstractTask from "../tasks/AbstractTask";
import type { Awaitable } from "../types/utils";

abstract class BlazePlugin {
    public constructor(protected readonly blaze: Blaze) {}
    public abstract boot(): Awaitable<void>;
    public tasks?(): Awaitable<Iterable<new (blaze: Blaze) => AbstractTask>>;
}

export default BlazePlugin;
