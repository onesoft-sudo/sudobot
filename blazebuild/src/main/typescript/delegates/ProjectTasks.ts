import type BlazeBuild from "../core/BlazeBuild";
import type TaskManager from "../services/TaskManager";
import type AbstractTask from "../tasks/AbstractTask";
import TaskBuilder from "../tasks/TaskBuilder";

export class UnregisteredTaskError extends Error {
    public readonly taskBuilder: TaskBuilder;

    public constructor(taskBuilder: TaskBuilder) {
        super("Unregistered task found");
        this.name = "UnregisteredTaskError";
        this.taskBuilder = taskBuilder;
    }

    public get modifiedMessage(): string {
        return `Unregistered task found: ${this.taskBuilder.taskOptions.name ?? "<unnamed>"}`;
    }

    public get modifiedStack(): string {
        return (this.stack ?? "").replace(
            /UnregisteredTaskError: Unregistered task found\n/,
            `UnregisteredTaskError: ${this.modifiedMessage}\n`
        );
    }
}

class ProjectTasks {
    private readonly blaze: BlazeBuild;
    private readonly taskManager: TaskManager;

    public constructor(blaze: BlazeBuild) {
        this.blaze = blaze;
        this.taskManager = blaze.taskManager;
    }

    public define(name: string): TaskBuilder {
        return this.new().name(name);
    }

    public new(): TaskBuilder {
        const builder = new TaskBuilder(this.taskManager);
        this.taskManager.unregisteredTasks.set(
            builder,
            new UnregisteredTaskError(builder)
        );
        return builder;
    }

    public register(task: new (blaze: BlazeBuild) => AbstractTask): void {
        this.taskManager.registerClass(task);
    }
}

export default ProjectTasks;
