import type { Build } from "../core/Build.js";
import type { TaskConstructor } from "../tasks/TaskManager.js";
import type { Awaitable } from "../types/Awaitable.js";

export abstract class AbstractPlugin {
    public constructor(protected readonly build: Build) {}
    public abstract tasks(): Awaitable<Iterable<TaskConstructor>>;
    public setup?(): Awaitable<void>;
}
