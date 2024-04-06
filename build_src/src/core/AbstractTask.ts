import { TaskMetadata } from "../decorators/Task";
import { FileResolvable } from "../io/File";
import { TaskOutput } from "../io/TaskOutput";
import { Awaitable } from "../types/Awaitable";
import BlazeBuild from "./BlazeBuild";
import { TaskResolvable } from "./Task";

type HookName = "pre" | "post";
type HookFunction = (this: AbstractTask<object>) => Awaitable<void>;

abstract class AbstractTask<C extends object | never = never> {
    public readonly name: string;
    private _inputs: FileResolvable[] = [];
    private _outputs: FileResolvable[] = [];
    private _taskNames?: string[];
    private _config?: C;
    public readonly dependencies: Array<TaskResolvable> = [];
    public readonly hooks: Record<HookName, HookFunction[]> = { pre: [], post: [] };

    public constructor(public readonly blaze: BlazeBuild) {
        this.name ??=
            this.constructor.name.charAt(0).toLowerCase() + this.constructor.name.slice(1);
    }

    protected addInputs(...files: FileResolvable[]): this {
        this._inputs.push(...files);
        return this;
    }

    protected addOutputs(...files: FileResolvable[]): this {
        this._outputs.push(...files);
        return this;
    }

    protected setInputs(...files: FileResolvable[]): this {
        this._inputs = files;
        return this;
    }

    protected setOutputs(...files: FileResolvable[]): this {
        this._outputs = files;
        return this;
    }

    public get inputs(): FileResolvable[] {
        return this._inputs;
    }

    public get outputs(): FileResolvable[] {
        return this._outputs;
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

    public async run(
        name = "execute" as Extract<
            keyof (this & { [K in keyof this]: (...args: unknown[]) => unknown }),
            string
        >
    ) {
        const key = this.name === name ? "execute" : name;
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
                `Task "${name}" does not exist on ${this.constructor.name} (looking for ${methodName})`
            );
        }

        const fn = this[methodName as keyof this] as TaskFunction;
        return await fn.call(this);
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
