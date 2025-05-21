import type TaskManager from "../services/TaskManager";
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
    private readonly taskManager: TaskManager;

    public constructor(taskManager: TaskManager) {
        this.taskManager = taskManager;
    }

    public define(name: string): TaskBuilder {
        return this.new().name(name);
    }

    public new(): TaskBuilder {
        const builder = new TaskBuilder(this.taskManager);

        this.taskManager.unregisteredTasks.set(builder, new UnregisteredTaskError(builder));

        return builder;
    }
}

export default ProjectTasks;
