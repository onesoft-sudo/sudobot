import { glob } from "glob";
import { CachingMode } from "../decorators/Caching";
import { TaskMetadata } from "../decorators/Task";
import { FileResolvable } from "../io/File";
import { TaskOutput } from "../io/TaskOutput";
import { Awaitable } from "../types/Awaitable";
import BlazeBuild from "./BlazeBuild";
import { TaskResolvable } from "./Task";

type HookName = "pre" | "post";
type HookFunction = (this: AbstractTask<object>) => Awaitable<void>;
type IoRecord = Record<string, FileResolvable[]>;

abstract class AbstractTask<C extends object | never = never> {
    public readonly name: string;
    private _inputs: IoRecord = {};
    private _outputs: IoRecord = {};
    private _taskNames?: string[];
    private _config?: C;
    public readonly dependencies: Array<TaskResolvable> = [];
    public readonly hooks: Record<HookName, HookFunction[]> = { pre: [], post: [] };
    private _preconditionResult?: boolean;
    protected readonly cachePrecondition: boolean = true;

    public constructor(public readonly blaze: BlazeBuild) {
        this.name ??=
            this.constructor.name.charAt(0).toLowerCase() + this.constructor.name.slice(1);
    }

    protected addInputs(task: string, ...files: FileResolvable[]): this {
        this._inputs[task] ??= [];
        this._inputs[task].push(...files);
        return this;
    }

    protected addOutputs(task: string, ...files: FileResolvable[]): this {
        this._outputs[task] ??= [];
        this._outputs[task].push(...files);
        return this;
    }

    protected setInputs(task: string, ...files: FileResolvable[]): this {
        this._inputs[task] = files;
        return this;
    }

    protected setOutputs(task: string, ...files: FileResolvable[]): this {
        this._outputs[task] = files;
        return this;
    }

    public get inputs(): FileResolvable[] {
        return this._inputs[this.name] ?? [];
    }

    public get outputs(): FileResolvable[] {
        return this._outputs[this.name] ?? [];
    }

    public async addOutputsByGlob(
        patterns: string | string[],
        options?: Parameters<typeof glob>[1],
        task?: string
    ) {
        return this.addOutputs(
            task ?? this.name,
            ...(await (options ? glob(patterns, options) : glob(patterns))).map(path =>
                typeof path === "string" ? path : path.path
            )
        );
    }

    public async addInputsByGlob(
        patterns: string | string[],
        options?: Parameters<typeof glob>[1],
        task?: string
    ) {
        return this.addInputs(
            task ?? this.name,
            ...(await (options ? glob(patterns, options) : glob(patterns))).map(path =>
                typeof path === "string" ? path : path.path
            )
        );
    }

    public async addInputsByGlobForTask(
        task: string,
        patterns: string | string[],
        options?: Parameters<typeof glob>[1]
    ) {
        return this.addInputsByGlob(patterns, options, task);
    }

    public async addOutputsByGlobForTask(
        task: string,
        patterns: string | string[],
        options?: Parameters<typeof glob>[1]
    ) {
        return this.addOutputsByGlob(patterns, options, task);
    }

    protected getConfig<K extends keyof C>(key: K): C[K] {
        if (this._config === undefined) {
            throw new Error("Task configuration has not been set");
        }

        return this._config[key];
    }

    public setConfig(config: C): this {
        this._config = config;
        return this;
    }

    public isUpToDate(name = "execute"): boolean {
        const methodName = this.getMethodName(name);
        const cacheMode: Record<keyof this, CachingMode> = {
            ...(Reflect.getMetadata("task:caching", this.constructor.prototype) || {}),
            ...(Reflect.getMetadata("task:caching", this.constructor) || {})
        };

        if (
            !cacheMode[methodName as keyof this] ||
            cacheMode[methodName as keyof this] === CachingMode.None
        ) {
            return false;
        }

        if (!this.blaze.fileSystemManager.isTaskUpToDate(name, "both")) {
            return false;
        }

        return true;
    }

    /**
     * Configures the task.
     *
     * @param options - The configuration options.
     */
    public configure?(options: C): void;

    /**
     * Executes the main task.
     *
     * @throws {Error} If the task fails.
     */
    public execute?(): ReturnType<TaskFunction>;

    /**
     * Checks if the task should run.
     *
     * @returns {boolean} Whether the task should run.
     */
    public precondition?(): Awaitable<boolean>;

    /**
     * Runs after the task has completed.
     */
    public doLast?(): Awaitable<void>;

    public async runPrecondition() {
        if (this.cachePrecondition && this._preconditionResult !== undefined) {
            return this._preconditionResult;
        }

        if (this.precondition !== undefined) {
            this._preconditionResult = await this.precondition();
        }

        return this._preconditionResult ?? true;
    }

    public async runHooks(name: HookName) {
        const hooks = this.hooks[name];

        if (name === "pre") {
            await this.doFirst?.();
        } else if (name === "post") {
            await this.doLast?.();
        }

        for (const hook of hooks) {
            await hook.call(this);
        }
    }

    /**
     * Runs before the task runs.
     */
    public doFirst?(): Awaitable<void>;

    public getAllTasks() {
        if (this._taskNames !== undefined) {
            return this._taskNames;
        }

        const tasks = [];

        if (this.execute !== undefined) {
            tasks.push(this.name);
        }

        const metadata = (Reflect.getMetadata("task:names", this) as TaskMetadata[]) ?? [];

        for (const { key, name, noPrefix } of metadata) {
            if (
                typeof key === "string" &&
                key in this &&
                typeof this[key as keyof this] === "function"
            ) {
                tasks.push(noPrefix ? name ?? key : `${this.name}:${name ?? key}`);
            }
        }

        this._taskNames = tasks;
        return tasks;
    }

    protected getMethodName(taskName = "execute") {
        const key = this.name === taskName ? "execute" : taskName;
        const methodName =
            key !== "execute"
                ? Reflect.getMetadata("task:names", this).find((info: TaskMetadata) => {
                      return (
                          `${!info.noPrefix ? this.name + ":" : ""}${info.name ?? info.key}` === key
                      );
                  })?.key
                : key;

        if (typeof this[methodName as keyof this] !== "function") {
            throw new Error(
                `Task "${taskName}" does not exist on ${this.constructor.name} (looking for ${methodName})`
            );
        }

        return methodName as string;
    }

    public async run(
        name = "execute" as Extract<
            keyof (this & { [K in keyof this]: (...args: unknown[]) => unknown }),
            string
        >
    ) {
        this.blaze.fileSystemManager.clearFiles(name);

        const methodName = this.getMethodName(name);
        const fn = this[methodName as keyof this] as TaskFunction;
        this.blaze.fileSystemManager.markAsRan(name);
        const result = await fn.call(this);

        for (const task in this._inputs) {
            this.blaze.fileSystemManager.addFiles(task, "input", ...this._inputs[task]);
        }

        for (const task in this._outputs) {
            this.blaze.fileSystemManager.addFiles(task, "output", ...this._outputs[task]);
        }

        return result;
    }

    public getDependencies(
        name = "execute" as Extract<
            keyof (this & { [K in keyof this]: (...args: unknown[]) => unknown }),
            string
        >
    ) {
        const key = this.name === name ? "execute" : name;
        const dependencies = key === "execute" ? [...this.dependencies] : [];

        if (Reflect.hasMetadata("task:dependencies", this.constructor.prototype)) {
            dependencies.push(
                ...(Reflect.getMetadata("task:dependencies", this.constructor.prototype)?.[key] ??
                    [])
            );
        }

        return dependencies;
    }
}

export type TaskFunction = () => Awaitable<void | undefined | null | TaskOutput[]>;

const _AbstractTask = ((global as unknown as Record<string, typeof AbstractTask>).__AbstractTask ??=
    AbstractTask);

export {
    _AbstractTask as AbstractTask,
    AbstractTask as AbstractTaskClass,
    _AbstractTask as default
};
