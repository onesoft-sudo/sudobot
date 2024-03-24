import chalk from "chalk";
import IO from "../io/IO";
import { TaskHandler } from "../types/TaskHandler";
import BlazeBuild from "./BlazeBuild";
import { Task } from "./Task";

export class TaskManager {
    public constructor(private readonly cli: BlazeBuild) {}

    public register(name: string, handler: TaskHandler): void;
    public register(name: string, dependsOn: string[], handler: TaskHandler): void;

    public register(name: string, handlerOrDeps: TaskHandler | string[], handler?: TaskHandler) {
        const finalHandler = Array.isArray(handlerOrDeps) ? handler! : handlerOrDeps;
        this.cli.tasks.set(
            name,
            new Task(
                this.cli,
                name,
                Array.isArray(handlerOrDeps) ? handlerOrDeps : [],
                finalHandler
            )
        );
    }

    private resolveTaskDependencies(taskName: string, resolved = new Set<Task>()) {
        const task = this.cli.tasks.get(taskName);

        if (!task) {
            IO.fail(`Task "${taskName}" is not defined`);
        }

        for (const dep of task.dependsOn) {
            const task = this.cli.tasks.get(dep);

            if (!task) {
                IO.fail(`Task "${dep}" is not defined`);
            }

            if (resolved.has(task)) {
                continue;
            }

            resolved.add(task);
            this.resolveTaskDependencies(dep, resolved);
        }

        resolved.add(task);
        return resolved;
    }

    public async execute(taskName: string, ignoreCache = false) {
        if (!ignoreCache && BlazeBuild.getInstance().executedTasks.includes(taskName)) {
            return;
        }

        const taskToRun = this.resolveTaskDependencies(taskName);

        for (const task of taskToRun) {
            IO.println(`${chalk.bold(`:${task.name}`)}`);
            await task.execute();
        }
    }
}
