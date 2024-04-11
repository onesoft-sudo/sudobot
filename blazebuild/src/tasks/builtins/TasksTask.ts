import chalk from "chalk";
import AbstractTask from "../../core/AbstractTask";
import { Task } from "../../core/Task";
import { Caching, CachingMode } from "../../decorators/Caching";
import IO from "../../io/IO";

@Caching(CachingMode.None)
class TasksTask extends AbstractTask {
    private static readonly UNGROUPED = Symbol("Ungrouped");
    public override readonly name = "tasks";
    public override readonly defaultDescription: string = "Lists all available tasks";
    public override readonly defaultGroup: string = "Core";

    public override async execute(): Promise<void> {
        const { tasks } = this.blaze.taskManager;
        const tasksArray = Array.from(tasks.values());
        const groupedTasks: Record<string | symbol, Task[]> = {};
        let maxLength = 0;

        for (const task of tasksArray) {
            const group =
                task.metadata?.defaultGroup ?? task.handler.defaultGroup ?? TasksTask.UNGROUPED;
            groupedTasks[group] ??= [];
            groupedTasks[group].push(task);

            if (group.toString().length > maxLength) {
                maxLength = group.toString().length;
            }

            if (task.name.length > maxLength) {
                maxLength = task.name.length;
            }
        }

        IO.println("");
        IO.println(chalk.white.bold("Available Tasks:"));
        IO.println("");

        for (const group of [TasksTask.UNGROUPED, ...Object.keys(groupedTasks)].sort((a, b) => {
            if (a === TasksTask.UNGROUPED) {
                return 1;
            }

            if (b === TasksTask.UNGROUPED) {
                return -1;
            }

            return a.toString().localeCompare(b.toString());
        })) {
            const groupString = `  ${(group as string | symbol) === TasksTask.UNGROUPED ? "Ungrouped" : group.toString()}`;
            IO.println(chalk.white.bold(groupString));
            IO.println("  " + chalk.white.dim("-".repeat(maxLength)));
            IO.println("");

            for (const task of groupedTasks[group].sort((a, b) => a.name.localeCompare(b.name))) {
                const description =
                    task.metadata?.defaultDescription ??
                    (task.handler.name === task.name
                        ? task.handler?.defaultDescription
                        : undefined) ??
                    "";

                IO.println(
                    `  ${task.name} ${chalk.white.dim(" ".repeat(maxLength - task.name.length))}   ${chalk.white.dim(description)}`
                );
            }

            if (groupedTasks[group].length > 0) {
                IO.println("");
            }
        }
    }
}

export default TasksTask;
