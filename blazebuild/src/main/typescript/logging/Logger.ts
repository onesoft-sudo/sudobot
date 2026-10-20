import chalk from "chalk";
import type { Build } from "../core/Build.js";

const startTime = Date.now();

export class Logger {
    public constructor(private readonly build: Build) {}

    public printTaskExecutionBegin(taskName: string, upToDate: boolean = false) {
        console.info(
            chalk.white.bold("> ") +
                chalk.blue.bold(`:${this.build.projectManager.project.name}:${taskName}`) +
                (upToDate ? chalk.green("  UP-TO-DATE") : "")
        );
    }

    private formatDuration() {
        const diff = Date.now() - startTime;
        let unit = "ms",
            value = diff;

        if (value >= 1000) {
            value /= 1000;
            unit = "s";

            if (value >= 60) {
                value /= 60;
                unit = "m";
            }

            if (value >= 60) {
                value /= 60;
                unit = "h";
            }
        }

        return `${Math.round(value)}${unit}`;
    }

    public printBuildFailed() {
        console.error();
        console.error(chalk.red.bold("BUILD FAILED") + chalk.reset(" in " + this.formatDuration()));
    }

    public printBuildSuccess() {
        console.info();
        console.info(chalk.green.bold("BUILD SUCCESSFUL") + chalk.reset(" in " + this.formatDuration()));
        const stats = this.build.taskManager.getTaskStats();

        if (!stats.totalTasks) {
            return;
        }

        let str = `${stats.totalTasks} task${stats.totalTasks === 1 ? "" : "s"} total: `;

        if (stats.staleTasks) {
            str += chalk.yellow(`${stats.staleTasks} executed`);
        }

        if (stats.skippedTasks) {
            str += `${str.at(-1) === " " ? "" : ", "}${chalk.green(`${stats.skippedTasks} up-to-date`)}`;
        }

        console.info(chalk.reset(str));
    }

    public printError(error: Error | string) {
        console.error(chalk.red.bold("An error has occurred:"));
        console.error(error);
    }

    public printErrorAndExit(error: Error | string): never {
        this.printError(error);
        process.exit(1);
    }
}
