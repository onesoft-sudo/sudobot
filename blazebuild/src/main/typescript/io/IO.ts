import chalk from "chalk";
import { performance } from "perf_hooks";
import Blaze from "../core/Blaze";

const now = performance.now();

class IO {
    public static println(message: unknown): void {
        console.log(message);
    }

    public static debug(message: string): void {
        if (process.env.BLAZE_DEBUG !== "1") {
            return;
        }

        console.debug(chalk.white.dim(message));
    }

    public static error(error: unknown): void {
        if (error instanceof Error) {
            console.error(chalk.red.bold("error: ") + error.message);
            console.error(error.stack);
            console.error(error.stack);
        } else {
            console.error(chalk.red.bold("error: ") + error);
        }
    }

    public static fatal(error: unknown): never {
        IO.error(error);
        IO.buildFailed();
        IO.exit(1);
    }

    private static timeDiffFromStartup(): string {
        let time = performance.now() - now;
        let str = "";

        if (time > 86400000) {
            str += `${Math.floor(time / 86400000)}d `;
            time %= 86400000;
        }

        if (time > 3600000) {
            str += `${Math.floor(time / 3600000)}h `;
            time %= 3600000;
        }

        if (time > 60000) {
            str += `${Math.floor(time / 60000)}m `;
            time %= 60000;
        }

        if (time > 1000) {
            str += `${(time / 1000).toFixed(2).replace(/\.00$/, "")}s `;
            time %= 1000;
        }

        if (str === "") {
            str += `${Math.floor(time)}ms`;
        }

        return str;
    }

    public static buildSuccessful(): void {
        console.log(`\n${chalk.green.bold("BUILD SUCCESSFUL")} in ${this.timeDiffFromStartup()}`);
        const actionableTasks = Blaze.getInstance().taskManager.getActionableTaskCount();
        const executedTasks = Blaze.getInstance().taskManager.getExecutedTaskCount();
        const upToDateTasks = Blaze.getInstance().taskManager.getUpToDateTasks();

        console.log(
            `${actionableTasks} actionable task${actionableTasks === 1 ? "" : "s"}: ${executedTasks === 0 ? "" : `${executedTasks} executed`}${upToDateTasks === 0 ? "" : `${upToDateTasks !== 0 && executedTasks !== 0 ? ", " : ""}${upToDateTasks} up-to-date`}`
        );
    }

    public static buildFailed(): void {
        console.log(`\n${chalk.red.bold("BUILD FAILED")} in ${this.timeDiffFromStartup()}`);
    }

    public static exit(code: number = 0): never {
        process.exit(code);
    }
}

export const println = IO.println.bind(IO);

export default IO;
