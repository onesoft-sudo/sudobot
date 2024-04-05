import { TaskMetadata } from "../decorators/Task";
import { FileResolvable } from "../io/File";
import { TaskOutput } from "../io/TaskOutput";
import { Awaitable } from "../types/Awaitable";
import BlazeBuild from "./BlazeBuild";

abstract class AbstractTask<C extends object | never = never> {
    public readonly name: string;
    private _inputs: FileResolvable[] = [];
    private _outputs: FileResolvable[] = [];
    private _taskNames?: string[];
    private _config?: C;

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

    public getAllTasks() {
        if (this._taskNames !== undefined) {
            return this._taskNames;
        }

        const tasks = [];

        if (this.execute !== undefined) {
            tasks.push(this.name);
        }

        const metadata = (Reflect.getMetadata("task_names", this) as TaskMetadata[]) ?? [];

        for (const { key, name, noPrefix } of metadata) {
            if (
                typeof key === "string" &&
                key in this &&
                typeof this[key as keyof this] === "function"
            ) {
                tasks.push(noPrefix ? name : `${this.name}:${name}`);
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

        if (typeof this[key] !== "function") {
            throw new Error(`Task "${name}" does not exist on ${this.constructor.name}`);
        }

        const fn = this[key] as TaskFunction;
        return await fn.call(this);
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
