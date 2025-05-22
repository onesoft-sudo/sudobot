import type TaskManager from "../services/TaskManager";
import TaskControl, {
    type TaskFunction,
    type TaskOptions
} from "./TaskControl";

class TaskBuilder {
    private readonly taskManager: TaskManager;
    public readonly taskOptions: Partial<TaskOptions> = {};
    private registered = false;

    public constructor(taskManager: TaskManager) {
        this.taskManager = taskManager;
    }

    public name(name: string): TaskBuilder {
        this.taskOptions.name = name;
        this.registerIfPossible();
        return this;
    }

    public description(description: string): TaskBuilder {
        this.taskOptions.description = description;
        return this;
    }

    public handler(handler: TaskFunction): TaskBuilder {
        this.taskOptions.handler = handler;
        this.registerIfPossible();
        return this;
    }

    public dependsOn(...dependencies: string[]): TaskBuilder {
        this.taskOptions.dependencies = dependencies;
        return this;
    }

    private registerIfPossible(): void {
        if (this.registered || !this.taskOptions.name) {
            return;
        }

        this.registered = true;
        this.taskManager.register(
            new TaskControl(this.taskOptions as TaskOptions, {})
        );
        this.taskManager.unregisteredTasks.delete(this);
    }

    public inputFiles(
        inputFiles: string[] | (() => Promise<string[]>)
    ): TaskBuilder {
        this.taskOptions.inputFiles = Array.isArray(inputFiles)
            ? () => Promise.resolve(inputFiles)
            : inputFiles;
        return this;
    }

    public outputFiles(
        outputFiles: string[] | (() => Promise<string[]>)
    ): TaskBuilder {
        this.taskOptions.outputFiles = Array.isArray(outputFiles)
            ? () => Promise.resolve(outputFiles)
            : outputFiles;
        return this;
    }
}

export default TaskBuilder;
