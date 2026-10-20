import chalk from "chalk";
import { FreeTask } from "../../tasks/FreeTask.js";
import { TaskStatus } from "../../tasks/TaskStatus.js";

class TasksTask extends FreeTask {
    public override readonly description: string = "List all available tasks";

    public override execute() {
        console.log("\n" + chalk.green("Available tasks:"));
        console.log(chalk.white.dim("----------------"));

        for (const task of this.build.taskManager.getTasks()) {
            const description = task.description ? ` - ${task.description}` : "";
            console.log(chalk.cyan(task.name) + description);
        }

        return TaskStatus.Success;
    }
}

export default TasksTask;
