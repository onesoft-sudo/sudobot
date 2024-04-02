import chalk from "chalk";
import IO from "../io/IO";
import { Awaitable } from "../types/Awaitable";
import { TaskHandler } from "../types/TaskHandler";
import BlazeBuild from "./BlazeBuild";
import { Task } from "./Task";

export class TaskManager {
    public constructor(private readonly cli: BlazeBuild) {}

    public register(name: string, handler: TaskHandler): void;
    public register(name: string, dependsOn: string[], handler: TaskHandler): void;
    public register(
        name: string,
        dependsOn: string[],
        handler: TaskHandler,
        onlyIf?: (cli: BlazeBuild) => Awaitable<boolean>
    ): void;

    public register(
        name: string,
        handlerOrDeps: TaskHandler | string[],
        handler?: TaskHandler,
        onlyIf?: (cli: BlazeBuild) => Awaitable<boolean>
    ) {
        const finalHandler = Array.isArray(handlerOrDeps) ? handler! : handlerOrDeps;

        this.cli.tasks.set(
            name,
            new Task(
                this.cli,
                name,
                Array.isArray(handlerOrDeps) ? handlerOrDeps : [],
                finalHandler,
                onlyIf
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

    public async execute(taskName: string | string[], ignoreCache = false, handlers?: Handlers) {
        const taskNames = Array.isArray(taskName) ? taskName : [taskName];
        const tasksToRun = new Set<Task>();

        for (const taskName of taskNames) {
            const task = this.cli.tasks.get(taskName);

            if (!task) {
                IO.fail(`Task "${taskName}" is not defined`);
            }

            if (!ignoreCache && BlazeBuild.getInstance().executedTasks.includes(taskName)) {
                continue;
            }

            if (task.onlyIf && !(await task.onlyIf(this.cli))) {
                continue;
            }

            const tasks = this.resolveTaskDependencies(taskName);

            for (const dep of tasks) {
                if (dep.onlyIf && !(await dep.onlyIf(this.cli))) {
                    continue;
                }

                tasksToRun.add(dep);
            }
        }

        await handlers?.onExecBegin?.(tasksToRun);

        for (const task of tasksToRun) {
            if (task.onlyIf && !(await task.onlyIf(this.cli))) {
                await handlers?.onTaskCancel?.(task);
                continue;
            }

            await handlers?.onTaskBegin?.(task);
            IO.println(`${chalk.bold(`:${task.name}`)}`);
            await task.execute();
            await handlers?.onTaskEnd?.(task);
        }

        await handlers?.onExecEnd?.(tasksToRun);
    }
}

type Handlers = {
    onExecBegin?: (tasks: Set<Task>) => Awaitable<void>;
    onExecEnd?: (tasks: Set<Task>) => Awaitable<void>;
    onTaskBegin?: (task: Task) => Awaitable<void>;
    onTaskEnd?: (task: Task) => Awaitable<void>;
    onTaskCancel?: (task: Task) => Awaitable<void>;
};
