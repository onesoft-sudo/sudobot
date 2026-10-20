import { hash } from "node:crypto";
import TasksTask from "../builtins/tasks/TasksTask.js";
import type { Build } from "../core/Build.js";
import type { AbstractTask } from "./AbstractTask.js";
import { FreeTask } from "./FreeTask.js";
import { TaskStatus } from "./TaskStatus.js";

export type TaskIO = {
    inputs: string[];
    outputs: string[];
    dependencies: string[];
};

export class TaskManager {
    private readonly tasks = new Map<string, AbstractTask>();
    private readonly taskAttributeMap = new Map<string, TaskIO>();
    private readonly visitedTasks = new Set<string>();
    private readonly executedTasks = new Set<string>();
    private totalTasks = 0;
    private staleTasks = 0;

    public constructor(private readonly build: Build) {
        const builtins = [TasksTask];

        for (const task of builtins) {
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

    public register(task: new (build: Build) => AbstractTask) {
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
            `${task.name}-${taskAttributes.dependencies}-${taskAttributes.inputs.join(":")}-${taskAttributes.outputs.join(":")}`
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
                cache.setFileHash(`i:${file}`, currentHash);
                return true;
            }
        }

        for (const file of outputs) {
            const fileHash = cache.getFileHash(`o:${file}`);
            const currentHash = await cache.hashFile(file);

            if (!fileHash || fileHash !== currentHash) {
                cache.setFileHash(`o:${file}`, currentHash);
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
            cache.setFileHash(`i:${file}`, currentHash);
        }

        for (const file of outputs) {
            const currentHash = await cache.hashFile(file);
            cache.setFileHash(`o:${file}`, currentHash);
        }
    }

    public async execute(taskName: string) {
        const task = this.getTask(taskName);

        if (this.visitedTasks.has(taskName)) {
            return;
        }

        this.visitedTasks.add(taskName);
        this.totalTasks++;

        if (!(await this.checkStale(task))) {
            this.build.logger.printTaskExecutionBegin(taskName, true);
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

    public async teardown() {
        this.build.cacheManager.clearIOFileHashes();

        for (const taskName of this.visitedTasks) {
            const task = this.getTask(taskName);
            await this.rehashFiles(task);
        }
    }
}
