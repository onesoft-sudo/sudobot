import type { Build } from "../core/Build.js";
import type { Awaitable } from "../types/Awaitable.js";
import type { TaskStatus } from "./TaskStatus.js";

export abstract class AbstractTask {
    protected readonly build: Build;
    public readonly name: string;
    public readonly description?: string;

    public constructor(build: Build) {
        this.build = build;
        const name = this.constructor.name.replace(/Task$/, "");
        this.name = name[0].toLowerCase() + name.substring(1);
    }

    public isStale(): Awaitable<boolean> {
        return this.build.taskManager.checkStale(this);
    }

    public inputs(): Awaitable<string[]> {
        return [];
    }

    public outputs(): Awaitable<string[]> {
        return [];
    }

    public dependencies(): Awaitable<string[]> {
        return [];
    }

    public abstract execute(): Awaitable<TaskStatus>;
}
