import chalk from "chalk";
import AbstractTask from "../../tasks/AbstractTask";
import { Task } from "../../tasks/Task";
import { TaskAction } from "../../tasks/TaskAction";

@Task({
    description: "Lists all available tasks",
    group: "Help"
})
class TasksTask extends AbstractTask {
    @TaskAction
    public override async run() {
        const tasks = this.blaze.taskManager.getAvailableTasks();

        console.log(chalk.white.bold("\nAvailable tasks:"));

        const groupedTasks = Object.groupBy(
            tasks,
            ([_, details]) => details.options?.group ?? details.task.details?.group ?? "Ungrouped"
        );

        for (const group in groupedTasks) {
            console.log();

            const tasks = groupedTasks[group];

            if (!tasks) {
                continue;
            }

            console.log(chalk.whiteBright(group));
            console.log("-".repeat(group.length + 1));

            for (const [name, details] of tasks) {
                if (details.options?.hidden || details.task.details?.hidden) {
                    continue;
                }

                console.log(
                    chalk`{cyan ${name}} - {dim ${details.options?.description ?? details.task.details?.description ?? "No description"}}`
                );
            }
        }
    }
}

export default TasksTask;
