import chalk from "chalk";
import type BlazeBuild from "./BlazeBuild";

class BuiltInTasks {
    private static blaze: BlazeBuild;

    public static initialize(blaze: BlazeBuild): void {
        BuiltInTasks.blaze = blaze;
    }

    public static listTasks(): void {
        console.log("\n" + chalk.green("Available tasks:"));
        console.log(chalk.white.dim("----------------"));

        for (const task of BuiltInTasks.blaze.taskManager.getAll()) {
            const description = task.description ? ` - ${task.description}` : "";
            console.log(chalk.cyan(task.name) + description);
        }
    }
}

export default BuiltInTasks;
