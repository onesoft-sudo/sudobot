import chalk from "chalk";
import { lstat } from "fs/promises";
import type BlazeBuild from "../core/BlazeBuild";
import BuiltInTasks from "../core/BuiltInTasks";
import Service from "../core/Service";
import type { UnregisteredTaskError } from "../delegates/ProjectTasks";
import Task, { TaskOptionSymbol } from "../tasks/Task";
import type TaskBuilder from "../tasks/TaskBuilder";

export type TaskGraph = Map<string, Task[]>;
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
    private readonly tasks = new Map<string, Task>();

    public constructor(blaze: BlazeBuild) {
        super(blaze);
        this.initializeBuiltinTasks();
    }

    private initializeBuiltinTasks(): void {
        BuiltInTasks.initialize(this.blaze);

        const tasks: Task[] = [
            new Task({
                name: "tasks",
                description: "List all available tasks",
                handler: BuiltInTasks.listTasks
            })
        ];

        for (const task of tasks) {
            this.register(task);
        }
    }

    public register(task: Task): void {
        this.tasks.set(task.name, task);
    }

    public get(name: string): Task | undefined {
        return this.tasks.get(name);
    }

    public getAll(): Task[] {
        return Array.from(this.tasks.values());
    }

    public has(name: string): boolean {
        return this.tasks.has(name);
    }

    public remove(name: string): void {
        this.tasks.delete(name);
    }

    public getOrFail(name: string): Task {
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
        graph ??= this.buildGraph(entry);
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

            if (await this.isUpToDate(name)) {
                console.info(
                    `${chalk.whiteBright.bold(">")} ${chalk.white.dim("Task")} ${chalk.cyan(":" + this.blaze.projectManager.project.name + ":" + task.name)} ${chalk.green("UP-TO-DATE")}`
                );

                upToDateCount++;
                return;
            }

            const dependencies = graph.get(name) || [];

            for (const dependency of dependencies) {
                await executeTask(dependency.name);
            }

            console.info(
                `${chalk.whiteBright.bold(">")} ${chalk.white.dim("Task")} ${chalk.cyan(":" + this.blaze.projectManager.project.name + ":" + task.name)}`
            );

            await task.run();

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

    public buildGraph(entry: string): TaskGraph {
        const graph = new Map<string, Task[]>();
        const visited = new Set<string>();

        const visit = (name: string): void => {
            if (visited.has(name)) {
                return;
            }

            visited.add(name);

            const task = this.getOrFail(name);
            const dependencies = task[TaskOptionSymbol].dependencies || [];

            for (const dependency of dependencies) {
                visit(dependency);
            }

            graph.set(
                name,
                dependencies.map(dep => this.getOrFail(dep))
            );
        };

        visit(entry);
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
}

export default TaskManager;
