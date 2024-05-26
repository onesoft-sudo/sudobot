import type Blaze from "../core/Blaze";
import Manager from "../core/Manager";
import TaskNotFoundError from "../errors/TaskNotFoundError";
import type AbstractTask from "./AbstractTask";

class TaskManager extends Manager {
    private static readonly builtInTasks: Array<new (blaze: Blaze) => AbstractTask<any>> = [];
    private readonly tasks = new Map<string, AbstractTask<any>>();
    private readonly classToTaskMap = new Map<typeof AbstractTask<any>, AbstractTask<any>>();
    public readonly executedTasks = new Set<string>();
    public readonly upToDateTasks = new Set<string>();

    public override async boot() {
        for (const TaskClass of TaskManager.builtInTasks) {
            this.register(TaskClass);
        }
    }

    public register<R>(taskClass: new (blaze: Blaze) => AbstractTask<R>) {
        const task = new taskClass(this.blaze);
        this.tasks.set(task.determineName(), task);
        this.classToTaskMap.set(taskClass, task);
    }

    public resolveTask(taskName: string | typeof AbstractTask<any>) {
        const task =
            typeof taskName === "string"
                ? this.tasks.get(taskName)
                : this.classToTaskMap.get(taskName);

        if (!task) {
            throw new TaskNotFoundError(`Task '${taskName}' could not be found!`).setTaskName(
                typeof taskName === "string" ? taskName : taskName.name
            );
        }

        return task;
    }

    public async executeTask(taskName: string) {
        const task = this.resolveTask(taskName);
        await task.execute();
    }

    public getExecutedTaskCount() {
        return this.executedTasks.size;
    }

    public getUpToDateTasks() {
        return this.upToDateTasks.size;
    }

    public getActionableTaskCount() {
        return this.upToDateTasks.size + this.executedTasks.size;
    }
}

export default TaskManager;
