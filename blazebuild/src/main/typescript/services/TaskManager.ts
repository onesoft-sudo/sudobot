import chalk from "chalk";
import { lstat } from "fs/promises";
import type BlazeBuild from "../core/BlazeBuild";
import BuiltInTasks from "../core/BuiltInTasks";
import Service from "../core/Service";
import type { UnregisteredTaskError } from "../delegates/ProjectTasks";
import type AbstractTask from "../tasks/AbstractTask";
import type TaskBuilder from "../tasks/TaskBuilder";
import TaskContext from "../tasks/TaskContext";
import TaskControl from "../tasks/TaskControl";

export type TaskGraph = Map<string, TaskControl[]>;
export type TaskExecutionReport = {
    totalCount: number;
    executedCount: number;
    upToDateCount: number;
};

class TaskManager extends Service {
    public readonly unregisteredTasks = new Map<
        TaskBuilder,
        UnregisteredTaskError
    >();
    private readonly tasks = new Map<string, TaskControl>();

    public constructor(blaze: BlazeBuild) {
        super(blaze);
        this.initializeBuiltinTasks();
    }

    private initializeBuiltinTasks(): void {
        BuiltInTasks.initialize(this.blaze);

        const tasks: TaskControl[] = [
            new TaskControl(
                {
                    name: "tasks",
                    description: "List all available tasks",
                    handler: BuiltInTasks.listTasks
                },
                {}
            )
        ];

        for (const task of tasks) {
            this.register(task);
        }
    }

    public register(task: TaskControl): void {
        this.tasks.set(task.name, task);
    }

    public get(name: string): TaskControl | undefined {
        return this.tasks.get(name);
    }

    public getAll(): TaskControl[] {
        return Array.from(this.tasks.values());
    }

    public has(name: string): boolean {
        return this.tasks.has(name);
    }

    public remove(name: string): void {
        this.tasks.delete(name);
    }

    public getOrFail(name: string): TaskControl {
        const task = this.get(name);

        if (!task) {
            this.blaze.logger.error(`Task "${name}" not found`);
            process.exit(1);
        }

        return task;
    }

    public async isUpToDate(name: string): Promise<boolean> {
        const cache = this.blaze.cacheManager.getTaskCache(name);

        if (!cache) {
            return false;
        }

        const inputFiles = cache.inputFiles || {};
        const outputFiles = cache.outputFiles || {};

        if (
            Object.keys(inputFiles).length === 0 &&
            Object.keys(outputFiles).length === 0
        ) {
            return false;
        }

        for (const [file, mtime] of Object.entries(inputFiles)) {
            try {
                const stats = await lstat(file);

                if (!mtime || stats.mtimeMs > mtime) {
                    return false;
                }
            } catch (error) {
                return false;
            }
        }

        for (const [file, mtime] of Object.entries(outputFiles)) {
            try {
                const stats = await lstat(file);

                if (!mtime || stats.mtimeMs < mtime) {
                    return false;
                }
            } catch (error) {
                return false;
            }
        }

        return true;
    }

    public async execute(
        entry: string,
        graph?: TaskGraph
    ): Promise<TaskExecutionReport> {
        graph ??= await this.buildGraph(entry);
        const visited = new Set<string>();
        let totalCount = 0,
            executedCount = 0,
            upToDateCount = 0;

        const executeTask = async (name: string) => {
            if (visited.has(name)) {
                return;
            }

            visited.add(name);

            const task = this.getOrFail(name);

            totalCount++;

            const dependencies = graph.get(name) || [];

            for (const dependency of dependencies) {
                await executeTask(dependency.name);
            }

            if (await this.isUpToDate(name)) {
                console.info(
                    `${chalk.whiteBright.bold(">")} ${chalk.white.dim("Task")} ${chalk.cyan(":" + this.blaze.projectManager.properties.name + ":" + task.name)} ${chalk.green("UP-TO-DATE")}`
                );

                upToDateCount++;
                return;
            }

            console.info(
                `${chalk.whiteBright.bold(">")} ${chalk.white.dim("Task")} ${chalk.cyan(":" + this.blaze.projectManager.properties.name + ":" + task.name)}`
            );

            const taskContext = new TaskContext(this.blaze, task);
            await task.run(taskContext);

            const inputFiles: Record<string, number | null> = {};
            const outputFiles: Record<string, number | null> = {};

            for (const file of await task.inputFiles()) {
                try {
                    const stats = await lstat(file);
                    inputFiles[file] = stats.mtimeMs;
                } catch (error) {
                    inputFiles[file] = null;
                }
            }

            for (const file of await task.outputFiles()) {
                try {
                    const stats = await lstat(file);
                    outputFiles[file] = stats.mtimeMs;
                } catch (error) {
                    outputFiles[file] = null;
                }
            }

            this.blaze.cacheManager.setTaskCache(task.name, {
                taskArgs: [],
                inputFiles,
                outputFiles
            });

            executedCount++;
        };

        const entryTask = this.getOrFail(entry);
        await executeTask(entryTask.name);

        return {
            totalCount,
            executedCount,
            upToDateCount
        };
    }

    public async buildGraph(entry: string): Promise<TaskGraph> {
        const graph = new Map<string, TaskControl[]>();
        const visited = new Set<string>();

        const visit = async (name: string): Promise<void> => {
            if (visited.has(name)) {
                return;
            }

            visited.add(name);

            const task = this.getOrFail(name);
            const dependencies = await task.getDependencies();

            for (const dependency of dependencies) {
                visit(dependency);
            }

            graph.set(
                name,
                dependencies.map(dep => this.getOrFail(dep))
            );
        };

        await visit(entry);
        return graph;
    }

    public printGraph(
        entry: string,
        graph: TaskGraph,
        depth = 0,
        visited = new Set<string>()
    ): void {
        const dependencies = graph.get(entry);

        visited.add(entry);
        console.log(
            `${chalk.white.dim("| ".repeat(depth) + (!dependencies?.length ? "-" : "+"))} ${depth == 0 ? chalk.whiteBright.bold(entry) : entry}`
        );

        for (const dependency of dependencies || []) {
            if (!visited.has(dependency.name)) {
                this.printGraph(dependency.name, graph, depth + 1, visited);
            }
        }
    }

    public modifyTask(name: string, modify: (task: TaskControl) => void): void {
        const existingTask = this.get(name);

        if (!existingTask) {
            throw new Error(`Task "${name}" not found`);
        }

        modify(existingTask);
    }

    public modifyOrCreateTask(
        name: string,
        modify: (task: TaskControl) => void
    ): void {
        const existingTask = this.get(name);

        if (existingTask) {
            modify(existingTask);
        } else {
            const task = new TaskControl(
                {
                    name,
                    description: "",
                    handler: () => {}
                },
                {}
            );

            modify(task);
            this.register(task);
        }
    }

    public registerClass(task: new (blaze: BlazeBuild) => AbstractTask) {
        const actionMethod: string =
            Reflect.getMetadata("task:action", task.prototype) || "run";
        const taskOptions = Reflect.getMetadata("task:options", task.prototype);

        const taskDependencyGenerator: string | null = Reflect.getMetadata(
            "task:dependencies:generator",
            task.prototype
        );
        const inputGenerator: string | null = Reflect.getMetadata(
            "task:input:generator",
            task.prototype
        );
        const outputGenerator: string | null = Reflect.getMetadata(
            "task:output:generator",
            task.prototype
        );
        const taskInstance = new task(this.blaze);

        if (
            !(actionMethod in taskInstance) &&
            typeof taskInstance[actionMethod as keyof typeof taskInstance] !==
                "function"
        ) {
            throw new Error(
                `Task ${task.name} does not have a valid action method.`
            );
        }

        const name =
            taskOptions?.name ??
            task.name[0].toLowerCase() +
                task.name.slice(1).replace(/Task$/, "");

        if (taskDependencyGenerator && taskOptions?.dependencies) {
            throw new Error(
                `Task ${task.name} has both a dependency generator and a list of dependencies. Please use one or the other.`
            );
        }

        const handler = (
            taskInstance[actionMethod as keyof typeof taskInstance] as Function
        ).bind(taskInstance);

        const getDependencies = () =>
            taskOptions?.dependencies ??
            (taskDependencyGenerator
                ? (
                      taskInstance[
                          taskDependencyGenerator as keyof typeof taskInstance
                      ] as Function
                  ).call(taskInstance)
                : []);

        if (inputGenerator && taskOptions?.inputFiles) {
            throw new Error(
                `Task ${task.name} has both an input generator and a list of input files. Please use one or the other.`
            );
        }

        const inputFiles =
            taskOptions?.inputFiles || inputGenerator
                ? () =>
                      taskOptions?.inputFiles ??
                      (inputGenerator
                          ? (
                                taskInstance[
                                    inputGenerator as keyof typeof taskInstance
                                ] as Function
                            ).call(taskInstance)
                          : [])
                : null;

        if (outputGenerator && taskOptions?.outputFiles) {
            throw new Error(
                `Task ${task.name} has both an output generator and a list of output files. Please use one or the other.`
            );
        }

        const outputFiles =
            taskOptions?.outputFiles || outputGenerator
                ? () =>
                      taskOptions?.outputFiles ??
                      (outputGenerator
                          ? (
                                taskInstance[
                                    outputGenerator as keyof typeof taskInstance
                                ] as Function
                            ).call(taskInstance)
                          : [])
                : null;

        this.register(
            new TaskControl(
                {
                    ...(taskOptions ?? {}),
                    name,
                    handler,
                    inputFiles,
                    outputFiles
                },
                { getDependencies }
            )
        );
    }
}

export default TaskManager;
