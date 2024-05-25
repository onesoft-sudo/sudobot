import type Blaze from "../core/Blaze";
import Manager from "../core/Manager";
import TaskNotFoundError from "../errors/TaskNotFoundError";
import type AbstractTask from "./AbstractTask";

class TaskManager extends Manager {
    private static readonly builtInTasks: Array<new (blaze: Blaze) => AbstractTask<any>> = [];
    private readonly tasks = new Map<string, AbstractTask<any>>();
    private readonly executedTasks = new Set<string>();

    public override async boot() {
        for (const TaskClass of TaskManager.builtInTasks) {
            this.register(TaskClass);
        }
    }

    public register<R>(taskClass: new (blaze: Blaze) => AbstractTask<R>) {
        const task = new taskClass(this.blaze);
        this.tasks.set(task.determineName(), task);
    }

    public resolveTask(taskName: string) {
        const task = this.tasks.get(taskName);

        if (!task) {
            throw new TaskNotFoundError(`Task ${taskName} not found!`).setTaskName(taskName);
        }

        return task;
    }

    public async executeTask(taskName: string) {
        const task = this.resolveTask(taskName);
        await task.execute();
        this.executedTasks.add(taskName);
    }

    public getExecutedTaskCount() {
        return this.executedTasks.size;
    }
}

export default TaskManager;