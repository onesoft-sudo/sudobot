import chalk from "chalk";
import { lstat } from "fs/promises";
import { DEFAULT_MODULE } from "../cache/CacheManager";
import type Blaze from "../core/Blaze";
import IO from "../io/IO";
import type { Awaitable } from "../types/utils";
import { TASK_ACTION_METADATA_KEY } from "./TaskAction";
import { TASK_DEPENDENCY_GENERATOR_METADATA_KEY } from "./TaskDependencyGenerator";
import { TASK_INPUT_GENERATOR_METADATA_KEY } from "./TaskInputGenerator";
import { TASK_OUTPUT_GENERATOR_METADATA_KEY } from "./TaskOutputGenerator";

abstract class AbstractTask<R = void> {
    protected readonly name?: string;
    private _input = new Set<string>();
    private _output = new Set<string>();

    public constructor(protected readonly blaze: Blaze) {}

    protected generateInput?(): Awaitable<Iterable<string>>;
    protected run?(): Awaitable<R>;
    protected generateOutput?(result: R): Awaitable<Iterable<string>>;
    protected dependencies?(): Awaitable<Iterable<TaskResolvable<any>>>;

    public async getIO() {
        return {
            input: this._input as ReadonlySet<string>,
            output: this._output as ReadonlySet<string>
        };
    }

    protected addOutput(...files: string[]) {
        for (const file of files) {
            this._output.add(file);
        }
    }

    protected clearOutput() {
        this._output.clear();
    }

    private findAction() {
        const methodName = Reflect.getMetadata(TASK_ACTION_METADATA_KEY, this);

        if (!methodName) {
            throw new Error("No action defined in task!");
        }

        return {
            methodName,
            call: (this[methodName as keyof this] as () => Awaitable<R>).bind(this)
        };
    }

    private findInputGenerator() {
        const methodName = Reflect.getMetadata(TASK_INPUT_GENERATOR_METADATA_KEY, this);

        if (!methodName) {
            return {
                methodName: null,
                call: null
            };
        }

        return {
            methodName,
            call: (this[methodName as keyof this] as () => Awaitable<Iterable<string>>).bind(this)
        };
    }

    private findOutputGenerator() {
        const methodName = Reflect.getMetadata(TASK_OUTPUT_GENERATOR_METADATA_KEY, this);

        if (!methodName) {
            return {
                methodName: null,
                call: null
            };
        }

        return {
            methodName,
            call: (
                this[methodName as keyof this] as (result: R) => Awaitable<Iterable<string>>
            ).bind(this)
        };
    }

    public async isUpToDate() {
        if (
            this.blaze.cacheManager.cache[DEFAULT_MODULE]?.buildFileModTime !==
            this.blaze.buildScriptManager.buildScriptLastModTime
        ) {
            IO.debug("Rerun due to build file modification time mismatch!");
            return false;
        }

        const previousInput = this.blaze.cacheManager.getCachedFiles(
            DEFAULT_MODULE,
            this.determineName(),
            "input"
        );

        const previousInputKeyCount = previousInput ? Object.keys(previousInput).length : 0;

        if (
            (previousInputKeyCount === 0 && this._input.size > 0) ||
            (previousInputKeyCount > 0 && this._input.size === 0)
        ) {
            IO.debug("Rerun due to input file count mismatch!");
            return false;
        }

        for (const file in previousInput) {
            const previousMtimeMs = previousInput[file];

            if (previousMtimeMs === undefined) {
                IO.debug("Rerun due to missing input file in previous cache!");
                return false;
            }

            let mtimeMs = null;

            try {
                mtimeMs = (await lstat(file)).mtimeMs;
            } catch (error) {
                IO.debug(
                    "Failed to stat input file during update check: " + (error as Error).message
                );
            }

            if (mtimeMs !== previousMtimeMs) {
                IO.debug("Rerun due to input file modification time mismatch!");
                return false;
            }
        }

        const previousOutput = this.blaze.cacheManager.getCachedFiles(
            DEFAULT_MODULE,
            this.determineName(),
            "output"
        );

        if (!previousOutput) {
            IO.debug("Rerun due to missing output cache!");
            return false;
        }

        for (const file in previousOutput) {
            const previousMtimeMs = previousOutput[file];

            if (previousMtimeMs === undefined) {
                IO.debug("Rerun due to missing output file in previous cache!");
                return false;
            }

            let mtimeMs = null;

            try {
                mtimeMs = (await lstat(file)).mtimeMs;
            } catch (error) {
                IO.debug(
                    "Failed to stat output file during update check: " + (error as Error).message
                );
            }

            if (mtimeMs !== previousMtimeMs) {
                IO.debug("Rerun due to output file modification time mismatch!");
                return false;
            }
        }

        return true;
    }

    private async getDependencies(set = new Set<AbstractTask<any>>()) {
        const methodName = Reflect.getMetadata(TASK_DEPENDENCY_GENERATOR_METADATA_KEY, this);

        if (!methodName) {
            return null;
        }

        const dependencies = await (
            this[methodName as keyof this] as () => Awaitable<Iterable<TaskResolvable<any>>>
        ).call(this);

        for (const dependency of dependencies) {
            let taskObject: AbstractTask<unknown>;

            if (typeof dependency === "string") {
                const task = this.blaze.taskManager.resolveTask(dependency);
                taskObject = task;
            } else {
                taskObject = this.blaze.taskManager.resolveTask(dependency);
            }

            await taskObject.getDependencies(set);
            set.add(taskObject);
        }

        return set;
    }

    public async execute(execDeps = true) {
        const name = this.determineName();

        if (this.blaze.taskManager.executedTasks.has(name)) {
            return;
        }

        const { call: callExecute } = this.findAction();
        const { call: callGenerateInput } = this.findInputGenerator();
        this._input = callGenerateInput ? new Set(await callGenerateInput()) : this._input;

        if (await this.isUpToDate()) {
            IO.println(`> ${chalk.white.dim(`:${name}`)} ${chalk.green(`UP-TO-DATE`)}`);
            this.blaze.taskManager.upToDateTasks.add(name);
            return;
        } else {
            if (process.env.BLAZE_DEBUG === "1") {
                IO.println(`> ${chalk.white.dim(`:${name}`)} ${chalk.red(`OUT-OF-DATE`)}`);
            }

            this.blaze.taskManager.upToDateTasks.delete(name);
        }

        if (execDeps) {
            const dependencies = await this.getDependencies();

            if (dependencies) {
                for (const dependency of dependencies) {
                    await dependency.execute(false);
                }
            }
        }

        IO.println(`> ${chalk.white.dim(`:${name}`)}`);
        const result = await callExecute();

        this.blaze.taskManager.executedTasks.add(name);
        const { call: callGenerateOutput } = this.findOutputGenerator();

        this._output = callGenerateOutput
            ? new Set(await callGenerateOutput(result))
            : this._output;

        for (const file of this._output) {
            let mtimeMs = null;

            try {
                mtimeMs = (await lstat(file)).mtimeMs;
            } catch (error) {
                IO.debug("Failed to stat output file: " + (error as Error).message);
            }

            this.blaze.cacheManager.setCachedLastModTime(
                DEFAULT_MODULE,
                name,
                "output",
                file,
                mtimeMs
            );
        }

        for (const file of this._input) {
            let mtimeMs = null;

            try {
                mtimeMs = (await lstat(file)).mtimeMs;
            } catch (error) {
                IO.debug("Failed to stat input file: " + (error as Error).message);
            }

            this.blaze.cacheManager.setCachedLastModTime(
                DEFAULT_MODULE,
                name,
                "input",
                file,
                mtimeMs
            );
        }
    }

    public determineName() {
        if (this.name) {
            return this.name;
        }

        const className = this.constructor.name;
        return className[0].toLowerCase() + className.slice(1).replace(/Task$/, "");
    }
}

export type TaskResolvable<T> = string | typeof AbstractTask<T>;

export default AbstractTask;
