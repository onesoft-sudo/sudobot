import chalk from "chalk";
import { lstat } from "fs/promises";
import { DEFAULT_MODULE } from "../cache/CacheManager";
import type Blaze from "../core/Blaze";
import Manager from "../core/Manager";
import TaskNotFoundError from "../errors/TaskNotFoundError";
import BuildTask from "../framework/tasks/BuildTask";
import GraphTask from "../framework/tasks/GraphTask";
import TasksTask from "../framework/tasks/TasksTask";
import IO from "../io/IO";
import type { FileResolvable } from "../types/file";
import type { Awaitable } from "../types/utils";
import AbstractTask, { type TaskResolvable } from "./AbstractTask";
import { ActionlessTask } from "./ActionlessTask";
import { TASK_DEPENDENCY_GENERATOR_METADATA_KEY } from "./TaskDependencyGenerator";
import TaskGraph from "./TaskGraph";
import { TaskOutputGenerator } from "./TaskOutputGenerator";

class TaskManager extends Manager {
    private static readonly builtInTasks: Array<new (blaze: Blaze) => AbstractTask<any>> = [
        TasksTask,
        BuildTask,
        GraphTask
    ];
    private readonly tasks = new Map<string, TaskDetails<any>>();
    private readonly classToTaskMap = new Map<typeof AbstractTask<any>, TaskDetails<any>>();
    public readonly executedTasks = new Set<string>();
    public readonly upToDateTasks = new Set<string>();

    public override async boot() {
        for (const TaskClass of TaskManager.builtInTasks) {
            this.register(TaskClass);
        }
    }

    public getAvailableTasks(): ReadonlyMap<string, TaskDetails<any>> {
        return this.tasks;
    }

    public register<R>(
        taskClass: new (blaze: Blaze) => AbstractTask<R>,
        options?: TaskRegisterOptions<R>
    ): void;
    public register<R>(
        name: string,
        taskClass: new (blaze: Blaze) => AbstractTask<R>,
        options?: TaskRegisterOptionsWithoutName<R>
    ): void;
    public register<R>(name: string, options: TaskRegisterOptionsWithoutName<R>): void;
    public register<R>(options: TaskRegisterOptions<R> & { name: string }): void;

    public register<R>(
        arg1:
            | (new (blaze: Blaze) => AbstractTask<R>)
            | string
            | (TaskRegisterOptions<R> & { name: string }),
        arg2?: (new (blaze: Blaze) => AbstractTask<R>) | TaskRegisterOptions<R>,
        arg3?: TaskRegisterOptions<R>
    ) {
        if (typeof arg1 === "function" && (!arg2 || typeof arg2 === "object")) {
            this.registerWithClassAndOptions(arg1, arg2);
            return;
        }

        if (typeof arg1 === "object" && typeof arg1 !== "function" && arg1 && !arg2 && !arg3) {
            this.registerWithOptionsOnly(arg1);
            return;
        }

        if (
            typeof arg1 === "string" &&
            typeof arg2 === "object" &&
            typeof arg2 !== "function" &&
            arg2 &&
            !arg3
        ) {
            this.registerWithNameAndOptions(arg1, arg2);
            return;
        }

        if (typeof arg1 === "string" && typeof arg2 === "function") {
            this.registerWithNameAndClass(arg1, arg2, arg3);
            return;
        }

        throw new Error("Invalid arguments passed to register method");
    }

    public named<T extends AbstractTask<any>>(
        name: string,
        options: TaskRegisterOptions<unknown, T>
    ) {
        const task = this.resolveTask(name);

        task.options = {
            ...task.options,
            ...options
        };

        if (options.inputs !== undefined) {
            Reflect.defineProperty(task.task, "generateInput", {
                value: async () => {
                    return options.inputs ?? [];
                },
                configurable: true
            });

            TaskOutputGenerator(task.task, "generateInput");
        }

        if (options.outputs !== undefined) {
            Reflect.defineProperty(task.task, "generateOutput", {
                value: async () => {
                    return options.outputs ?? [];
                },
                configurable: true
            });

            TaskOutputGenerator(task.task, "generateOutput");
        }

        this.tasks.set(name, task);
    }

    private registerWithOptionsOnly<R>(options: TaskRegisterOptions<R> & { name: string }) {
        const DynamicClass = class extends AbstractTask<R> {
            public override generateInput =
                options.inputs !== undefined ? async () => options.inputs ?? [] : undefined;

            public override generateOutput =
                options.outputs !== undefined ? async () => options.outputs ?? [] : undefined;
        };

        ActionlessTask(DynamicClass);

        Object.defineProperty(DynamicClass, "name", { value: `Dynamic_${options.name}_Task` });
        this.registerWithNameAndClass(options.name, DynamicClass, options);
    }

    private registerWithNameAndOptions<R>(name: string, options: TaskRegisterOptions<R>) {
        this.registerWithOptionsOnly({ ...options, name });
    }

    private registerWithNameAndClass<R>(
        name: string,
        taskClass: new (blaze: Blaze) => AbstractTask<R>,
        options?: TaskRegisterOptionsWithoutName<R>
    ) {
        const details = this.registerWithClassAndOptions(taskClass, { ...options, name });
        this.classToTaskMap.set(taskClass, details);
    }

    private registerWithClassAndOptions<R>(
        taskClass: new (blaze: Blaze) => AbstractTask<R>,
        options?: TaskRegisterOptions<R>
    ) {
        const task = new taskClass(this.blaze);
        const details: TaskDetails<R> = {
            options,
            task
        };

        this.tasks.set(options?.name ?? task.determineName(), details);

        if (!options?.name) {
            this.classToTaskMap.set(taskClass, details);
        }

        return details;
    }

    public resolveTask(taskName: string | typeof AbstractTask<any>) {
        const task =
            typeof taskName === "string"
                ? this.tasks.get(taskName)
                : this.classToTaskMap.get(taskName);

        if (!task) {
            const name = typeof taskName === "string" ? taskName : taskName.name;
            throw new TaskNotFoundError(`Task '${name}' could not be found!`).setTaskName(name);
        }

        return task;
    }

    public async isUpToDate(
        taskName: string | AbstractTask<any>,
        dependencies?: Set<TaskDetails<unknown>> | null,
        customName?: string
    ) {
        const { task, options } = this.resolveTask(
            typeof taskName === "string"
                ? taskName
                : (taskName.constructor as typeof AbstractTask<any>)
        );
        const name = customName ?? options?.name ?? task.determineName();

        if (
            this.blaze.cacheManager.cache[DEFAULT_MODULE]?.buildFileModTime !==
            this.blaze.buildScriptManager.buildScriptLastModTime
        ) {
            IO.debug("Rerun due to build file modification time mismatch!");
            return false;
        }

        const finalDependencies =
            dependencies === undefined ? await this.getTaskDependencies(task) : dependencies;

        if (finalDependencies) {
            for (const dependency of finalDependencies) {
                if (!dependency.task.hasComputedInput) {
                    await dependency.task.computeInput();
                }

                if (
                    !(await this.isUpToDate(
                        dependency.options?.name ?? dependency.task.determineName(),
                        undefined,
                        dependency.options?.name
                    ))
                ) {
                    IO.debug(
                        "Rerun due to a task dependency being out-of-date! Dependency: " +
                            (dependency.options?.name ?? dependency.task.determineName())
                    );
                    return false;
                }
            }
        }

        const previousInput = this.blaze.cacheManager.getCachedFiles(DEFAULT_MODULE, name, "input");
        const previousInputKeyCount = previousInput ? Object.keys(previousInput).length : 0;
        const { input } = task.io;

        if (
            (previousInputKeyCount === 0 && input.size > 0) ||
            (previousInputKeyCount > 0 && input.size === 0)
        ) {
            IO.debug("Rerun due to input file count mismatch! Task: " + name);
            IO.debug("Previous input count: " + previousInputKeyCount);
            IO.debug("Current input count: " + input.size);
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
            name,
            "output"
        );
        const previousOutputKeyCount = previousOutput ? Object.keys(previousOutput).length : 0;

        if (previousOutput) {
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
                        "Failed to stat output file during update check: " +
                            (error as Error).message
                    );
                }

                if (mtimeMs !== previousMtimeMs) {
                    IO.debug("Rerun due to output file modification time mismatch! File: " + file);
                    return false;
                }
            }
        }

        if (input.size === 0 && !previousInputKeyCount && !previousOutputKeyCount) {
            IO.debug(
                "Rerun due to missing input and output files in previous cache! Assuming this task is always out-of-date."
            );
            IO.debug("Previous input count: " + previousInputKeyCount);
            IO.debug("Previous output count: " + previousOutputKeyCount);
            IO.debug("Current input count: " + input.size);
            return false;
        }

        return true;
    }

    public async getTaskDependencies(
        taskResolvable: string | AbstractTask<any>,
        set = new Set<TaskDetails<unknown>>(),
        deep = true
    ) {
        const { task, options } = this.resolveTask(
            typeof taskResolvable === "string"
                ? taskResolvable
                : (taskResolvable.constructor as typeof AbstractTask<any>)
        );
        const methodName = Reflect.getMetadata(TASK_DEPENDENCY_GENERATOR_METADATA_KEY, task);

        const dependencies = methodName
            ? await (
                  task[methodName as keyof typeof task] as () => Awaitable<
                      Iterable<TaskResolvable<any>>
                  >
              ).call(task)
            : [];

        for (const dependency of [...dependencies, ...(options?.dependsOn ?? [])]) {
            const details: TaskDetails<unknown> = this.blaze.taskManager.resolveTask(dependency);

            if (deep) {
                await this.getTaskDependencies(details.task, set);
            }

            set.add(details);
        }

        return set;
    }

    public async executeTask(
        taskName: string | AbstractTask<any>,
        customName?: string,
        ownsProgress = true
    ) {
        const { task, options } = this.resolveTask(
            typeof taskName === "string"
                ? taskName
                : (taskName.constructor as typeof AbstractTask<any>)
        );
        const name = customName ?? options?.name ?? task.determineName();

        if (this.executedTasks.has(name)) {
            IO.progress?.increment();
            return;
        }

        IO.progress?.setStatus("<computing>");

        await task.computeInput();
        const dependencies = await this.getTaskDependencies(task);

        if (await this.isUpToDate(task, dependencies, customName)) {
            if (!this.upToDateTasks.has(name)) {
                IO.progress?.increment();
                IO.println(`> Task ${chalk.white.dim(`:${name}`)} ${chalk.green(`UP-TO-DATE`)}`);
            }

            this.upToDateTasks.add(name);
            return;
        } else {
            if (process.env.BLAZE_DEBUG === "1") {
                IO.println(`> Task ${chalk.white.dim(`:${name}`)} ${chalk.red(`OUT-OF-DATE`)}`);
            }

            this.upToDateTasks.delete(name);
        }

        if (ownsProgress) {
            if (!IO.progress) {
                IO.createProgress(dependencies.size + 1);
            } else {
                IO.progress.addToTotal(dependencies.size + 1);
            }
        } else if (IO.progress) {
            IO.progress.addToTotal(dependencies.size);
        }

        if (dependencies) {
            for (const dependency of dependencies) {
                await this.executeTask(dependency.task, dependency.options?.name, false);
            }
        }

        IO.progress?.setStatus(`Task :${name}`);

        if (options?.parseArgsOptions || task.definedParseArgsOptions) {
            task.parseArgs({
                ...(options?.parseArgsOptions ?? task.definedParseArgsOptions),
                args: this.blaze.cliArgs
            });
        }

        await options?.doFirst?.call(task);
        IO.println(`> Task ${chalk.white.dim(`:${name}`)}`);
        await task.execute();
        await options?.doLast?.call(task);
        this.executedTasks.add(name);
        IO.progress?.increment();
        await this.updateTaskIO(task, customName);
        IO.progress?.setStatus("<idle>");
    }

    private async updateTaskIO(taskResolvable: string | AbstractTask<any>, customName?: string) {
        const { task, options } = this.resolveTask(
            typeof taskResolvable === "string"
                ? taskResolvable
                : (taskResolvable.constructor as typeof AbstractTask<any>)
        );
        const name = customName ?? options?.name ?? task.determineName();
        const { input, output } = task.io;

        for (const file of output) {
            let mtimeMs = null;

            try {
                await file.waitUntilUsable();
                mtimeMs = file.modifiedTimestamp;
            } catch (error) {
                IO.debug("Failed to stat output file: " + (error as Error).message);
            }

            this.blaze.cacheManager.setCachedLastModTime(
                DEFAULT_MODULE,
                name,
                "output",
                file.path,
                mtimeMs
            );
        }

        for (const file of input) {
            let mtimeMs = null;

            try {
                await file.waitUntilUsable();
                mtimeMs = file.modifiedTimestamp;
            } catch (error) {
                IO.debug("Failed to stat input file: " + (error as Error).message);
            }

            this.blaze.cacheManager.setCachedLastModTime(
                DEFAULT_MODULE,
                name,
                "input",
                file.path,
                mtimeMs
            );
        }
    }

    public getExecutedTaskCount() {
        return this.executedTasks.size;
    }

    public getUpToDateTasks() {
        return this.upToDateTasks.size;
    }

    public getActionableTaskCount() {
        return this.upToDateTasks.size + this.executedTasks.size;
    }

    public async getTaskGraph<T>(resolvable: TaskResolvable<T>) {
        const taskDetails = this.resolveTask(resolvable);
        return new TaskGraph(taskDetails);
    }
}

export type TaskRegisterOptions<R, T extends AbstractTask<R> = AbstractTask<R>> = {
    doFirst?(this: T): Awaitable<void>;
    doLast?(this: T): Awaitable<void>;
    name?: string;
    dependsOn?: Iterable<string | typeof AbstractTask<any>>;
    description?: string;
    hidden?: boolean;
    group?: string;
    outputs?: Iterable<FileResolvable>;
    inputs?: Iterable<FileResolvable>;
    parseArgsOptions?: Omit<
        NonNullable<Parameters<typeof AbstractTask.prototype.parseArgs>[0]>,
        "args"
    >;
};

type TaskRegisterOptionsWithoutName<R> = Omit<TaskRegisterOptions<R>, "name">;

export type TaskDetails<R> = {
    task: AbstractTask<R>;
    options?: TaskRegisterOptions<R>;
};

export default TaskManager;
