import { hash } from "node:crypto";
import BuildTask from "../builtins/tasks/BuildTask.js";
import CompileBuildSrcTask from "../builtins/tasks/CompileBuildSrcTask.js";
import TasksTask from "../builtins/tasks/TasksTask.js";
import type { Build } from "../core/Build.js";
import type { AbstractTask } from "./AbstractTask.js";
import { FreeTask } from "./FreeTask.js";
import TaskModifier from "./TaskModifier.js";
import { TaskStatus } from "./TaskStatus.js";

export type TaskAttributes = {
    inputs: string[];
    outputs: string[];
    dependencies: string[];
};

export type TaskConstructor = new (build: Build) => AbstractTask;

export class TaskManager {
    private static readonly BUILTIN_TASKS = [TasksTask, CompileBuildSrcTask, BuildTask];

    private readonly tasks = new Map<string, AbstractTask>();
    private readonly taskAttributeMap = new Map<string, TaskAttributes>();
    private readonly visitedTasks = new Set<string>();
    private readonly reachedTasks = new Set<string>();
    private readonly executedTasks = new Set<string>();
    private totalTasks = 0;
    private staleTasks = 0;

    public constructor(private readonly build: Build) {
        for (const task of TaskManager.BUILTIN_TASKS) {
            this.register(task);
        }
    }

    public getTasks() {
        return [...this.tasks.values()];
    }

    public getTaskStats() {
        return {
            totalTasks: this.totalTasks,
            staleTasks: this.staleTasks,
            skippedTasks: this.totalTasks - this.staleTasks
        };
    }

    public async findByName(name: string) {
        const task = this.getTask(name);
        const taskAttributes = await this.getTaskAttributes(task);
        return new TaskModifier(taskAttributes);
    }

    public register(task: TaskConstructor) {
        this.build.logger.printDebugMessage(`Registering task: ${task.name}`);
        const taskObject = new task(this.build);
        this.tasks.set(taskObject.name, taskObject);
        return taskObject;
    }

    private async getTaskAttributes(task: AbstractTask) {
        let taskAttributes = this.taskAttributeMap.get(task.name);

        if (taskAttributes) {
            return taskAttributes;
        }

        taskAttributes = {
            inputs: await task.inputs(),
            outputs: await task.outputs(),
            dependencies: await task.dependencies()
        };

        this.taskAttributeMap.set(task.name, taskAttributes);
        return taskAttributes;
    }

    public async hashTask(task: AbstractTask) {
        const taskAttributes = await this.getTaskAttributes(task);

        return hash(
            "sha256",
            `${task.name}-${taskAttributes.dependencies}-${taskAttributes.inputs.toSorted().join(":")}-${taskAttributes.outputs.toSorted().join(":")}`
        );
    }

    public getTask(name: string) {
        const task = this.tasks.get(name);

        if (!task) {
            this.build.logger.printErrorAndExit(`Task '${name}' not found`);
        }

        return task;
    }

    public async checkStale(task: AbstractTask) {
        this.reachedTasks.add(task.name);

        if (task instanceof FreeTask) {
            return true;
        }

        const cache = this.build.cacheManager;
        const taskHash = await this.hashTask(task);

        if (cache.getTaskHash(task.name) !== taskHash) {
            cache.setTaskHash(task.name, taskHash);
            return true;
        }

        const { dependencies, inputs, outputs } = await this.getTaskAttributes(task);

        for (const file of inputs) {
            const fileHash = cache.getFileHash(`i:${file}`);
            const currentHash = await cache.hashFile(file);

            if (!fileHash || fileHash !== currentHash) {
                return true;
            }
        }

        for (const file of outputs) {
            const fileHash = cache.getFileHash(`o:${file}`);
            const currentHash = await cache.hashFile(file);

            if (!fileHash || fileHash !== currentHash) {
                console.log("RERUN", task.name, file, fileHash, currentHash);
                return true;
            }
        }

        for (const dependency of dependencies) {
            const task = this.getTask(dependency);

            if (await task.isStale()) {
                return true;
            }
        }

        return false;
    }

    public async rehashFiles(task: AbstractTask) {
        const cache = this.build.cacheManager;
        const { inputs, outputs } = await this.getTaskAttributes(task);

        for (const file of inputs) {
            const currentHash = await cache.hashFile(file);

            if (currentHash) {
                cache.setFileHash(`i:${file}`, currentHash);
            }
        }

        for (const file of outputs) {
            const currentHash = await cache.hashFile(file);

            if (currentHash) {
                cache.setFileHash(`o:${file}`, currentHash);
            }
        }
    }

    public async execute(taskName: string, nonStaleCount = true) {
        const task = this.getTask(taskName);
        this.reachedTasks.add(taskName);

        if (this.visitedTasks.has(taskName)) {
            return;
        }

        this.visitedTasks.add(taskName);

        if (!(await this.checkStale(task))) {
            if (nonStaleCount) {
                this.totalTasks++;
                this.build.logger.printTaskExecutionBegin(taskName, true);
            }

            return;
        }

        this.totalTasks++;

        if (task.precondition && !(await task.precondition?.())) {
            this.build.logger.printDebugMessage(`Precondition of task '${task.name}' failed`);
            return;
        }

        const { dependencies } = await this.getTaskAttributes(task);
        const promises = [];

        for (const dependency of dependencies) {
            promises.push(this.execute(dependency));
        }

        await Promise.all(promises);

        this.build.logger.printTaskExecutionBegin(taskName);
        const rc = await task.execute();
        this.executedTasks.add(taskName);
        this.staleTasks++;

        if (rc === TaskStatus.Failure) {
            this.build.logger.printErrorAndExit(`Task '${taskName}' returned failure`);
        }
    }

    public async rehashFilesRecursive(tasks: Iterable<string> = this.visitedTasks, rehashedSet = new Set<string>()) {
        for (const taskName of tasks) {
            if (rehashedSet.has(taskName)) {
                continue;
            }

            const task = this.getTask(taskName);
            const dependencies = (await this.getTaskAttributes(task)).dependencies;
            await this.rehashFiles(task);

            if (dependencies.length) {
                await this.rehashFilesRecursive(dependencies, rehashedSet);
            }

            rehashedSet.add(taskName);
        }
    }

    public async teardown() {
        this.build.cacheManager.clearIOFileHashes();
        await this.rehashFilesRecursive();
    }
}
