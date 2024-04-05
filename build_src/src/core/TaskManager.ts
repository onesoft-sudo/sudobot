import chalk from "chalk";
import IO from "../io/IO";
import { TaskOutput } from "../io/TaskOutput";
import { Awaitable } from "../types/Awaitable";
import { TaskHandler } from "../types/TaskHandler";
import { Class } from "../utils/Class";
import AbstractTask, { TaskFunction } from "./AbstractTask";
import BlazeBuild from "./BlazeBuild";
import { Task, TaskRegisterOptions } from "./Task";

export class TaskManager {
    public readonly tasks = new Map<string, Task>();
    public readonly completedTasks = new Set<string>();

    public constructor(private readonly cli: BlazeBuild) {}

    public register<T extends typeof AbstractTask>(handler: T, options?: TaskRegisterOptions): void;
    public register<T extends typeof AbstractTask>(
        name: string,
        handler?: TaskHandler<T>,
        options?: TaskRegisterOptions
    ): void;

    public register<T extends typeof AbstractTask>(
        handlerOrName: string | T,
        handlerOrOptions?: TaskHandler<T> | TaskRegisterOptions,
        options?: TaskRegisterOptions<InstanceType<T>>
    ) {
        const handler =
            typeof handlerOrName === "string" ? (handlerOrOptions as TaskHandler) : handlerOrName;
        const finalHandler =
            handler.prototype instanceof AbstractTask
                ? new (handler as Class<InstanceType<T>>)(this.cli)
                : (handler as TaskFunction);

        const instance =
            typeof finalHandler === "function"
                ? new (class extends AbstractTask {
                      public override readonly name: string;

                      public constructor(blaze: BlazeBuild) {
                          super(blaze);
                          this.name =
                              typeof handlerOrName === "string"
                                  ? handlerOrName
                                  : this.constructor.name.charAt(0).toLowerCase() +
                                    this.constructor.name.slice(1);
                      }

                      public override execute(): Awaitable<void | TaskOutput[] | null | undefined> {
                          return finalHandler.call(this);
                      }
                  })(this.cli)
                : finalHandler;

        const name = typeof handlerOrName === "string" ? handlerOrName : instance.name;

        for (const finalName of new Set([name, ...instance.getAllTasks()])) {
            if (this.tasks.has(finalName)) {
                IO.fail(
                    `Task "${finalName}" is already defined (in ${name} aka ${
                        instance.constructor.name || "(anonymous)"
                    })`
                );
            }

            this.tasks.set(finalName, {
                name: finalName,
                dependsOn: options?.dependencies ?? [],
                handler: instance,
                options: (typeof handlerOrName === "string"
                    ? options
                    : handlerOrOptions) as TaskRegisterOptions,
                onlyIf: options?.condition
            });
        }
    }

    private resolveTaskDependencies(taskName: string, resolved = new Set<Task>()) {
        const task = this.tasks.get(taskName);

        if (!task) {
            IO.fail(`Task "${taskName}" is not defined`);
        }

        for (const dep of task.dependsOn) {
            const task = this.tasks.get(dep);

            if (!task) {
                IO.fail(`Task "${dep}" is not defined`);
            }

            if (resolved.has(task)) {
                continue;
            }

            this.resolveTaskDependencies(dep, resolved);
            resolved.add(task);
        }

        resolved.add(task);
        return resolved;
    }

    public async execute(taskName: string | string[], ignoreCache = false, handlers?: Handlers) {
        const taskNames = Array.isArray(taskName) ? taskName : [taskName];
        const tasksToRun = new Set<Task>();

        for (const taskName of taskNames) {
            const task = this.tasks.get(taskName);

            if (!task) {
                IO.fail(`Task "${taskName}" is not defined`);
            }

            if (!ignoreCache && this.completedTasks.has(taskName)) {
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
            if (this.completedTasks.has(task.name)) {
                continue;
            }

            if (task.onlyIf && !(await task.onlyIf(this.cli))) {
                await handlers?.onTaskCancel?.(task);
                continue;
            }

            await handlers?.onTaskBegin?.(task);
            await task.options?.doFirst?.call(task.handler);

            IO.println(`${chalk.bold(`:${task.name}`)}`);

            await this.execHandler(task.handler, task.name);
            await handlers?.onTaskEnd?.(task);
            await task.options?.doLast?.call(task.handler);

            this.completedTasks.add(task.name);
        }

        await handlers?.onExecEnd?.(tasksToRun);
    }

    private execHandler(handler: Task["handler"], name: string) {
        return handler.run(name as keyof typeof handler);
    }
}

type Handlers = {
    onExecBegin?: (tasks: Set<Task>) => Awaitable<void>;
    onExecEnd?: (tasks: Set<Task>) => Awaitable<void>;
    onTaskBegin?: (task: Task) => Awaitable<void>;
    onTaskEnd?: (task: Task) => Awaitable<void>;
    onTaskCancel?: (task: Task) => Awaitable<void>;
};
