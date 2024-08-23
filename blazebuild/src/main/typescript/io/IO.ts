import chalk from "chalk";
import { performance } from "perf_hooks";
import Blaze from "../core/Blaze";
import Progress from "./Progress";

process.stdout.columns = 0;
process.stdout.rows = 0;
const now = performance.now();

class IO {
    private static _progress?: Progress;
    private static _quiet = false;

    public static setQuiet(quiet: boolean): void {
        this._quiet = quiet;
    }

    public static createProgress(total: number): void {
        if (!process.stdout.isTTY || this._quiet) {
            return;
        }

        this._progress = new Progress(total);
        this._progress.render();
    }

    public static get progress(): Progress | undefined {
        return this._progress;
    }

    public static print(
        message: unknown,
        consoleMethod: "log" | "error" | "warn" | "info" | "debug" = "log"
    ): void {
        if (this._quiet) {
            return;
        }

        if (this._progress) {
            this._progress.print(message, consoleMethod);
            return;
        }

        console[consoleMethod].call(
            console,
            typeof message === "string" ? message.padEnd(process.stdout.columns, " ") : message
        );
    }

    public static newline() {
        if (this._quiet) {
            return;
        }

        if (this._progress) {
            console.log(`\r${" ".repeat(Math.max(process.stdout.columns - 1, 0))}`);
            return;
        }

        console.log("");
    }

    public static println(message: unknown): void {
        if (this._quiet) {
            return;
        }

        if (this._progress) {
            this._progress.print(message);
            return;
        }

        console.log(message);
    }

    public static debug(message: string): void {
        if (this._quiet) {
            return;
        }

        if (process.env.BLAZE_DEBUG !== "1") {
            return;
        }

        if (this._progress) {
            this._progress.print(chalk.white.dim("debug: ") + chalk.white.dim(message), "debug");
            return;
        }

        console.debug(chalk.white.dim("debug: ") + chalk.white.dim(message));
    }

    public static destroyProgress(): void {
        if (this._quiet) {
            return;
        }

        this._progress?.destroy();
        this._progress = undefined;
    }

    public static error(error: unknown): void {
        if (this._quiet) {
            return;
        }

        this.destroyProgress();

        if (error instanceof Error) {
            this.print(chalk.red.bold("error: ") + error.message, "error");
            this.print(error.stack, "error");
            this.print(error.stack, "error");
        } else {
            this.print(chalk.red.bold("error: ") + error, "error");
        }
    }

    public static fatal(error: unknown): never {
        if (!this._quiet) {
            IO.error(error);
            IO.buildFailed();
        }

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
        if (this._quiet) {
            return;
        }

        this.destroyProgress();

        console.log("\r" + " ".repeat(Math.max(process.stdout.columns - 1, 0)));
        console.log(
            `${chalk.green.bold("BUILD SUCCESSFUL")} in ${this.timeDiffFromStartup()}`.padEnd(
                process.stdout.columns,
                " "
            )
        );
        const actionableTasks = Blaze.getInstance().taskManager.getActionableTaskCount();
        const executedTasks = Blaze.getInstance().taskManager.getExecutedTaskCount();
        const upToDateTasks = Blaze.getInstance().taskManager.getUpToDateTasks();

        console.log(
            `${actionableTasks} actionable task${actionableTasks === 1 ? "" : "s"}: ${executedTasks === 0 ? "" : `${executedTasks} executed`}${upToDateTasks === 0 ? "" : `${upToDateTasks !== 0 && executedTasks !== 0 ? ", " : ""}${upToDateTasks} up-to-date`}`
        );
    }

    public static buildFailed(): void {
        if (this._quiet) {
            return;
        }

        this.destroyProgress();
        console.log("\r" + " ".repeat(Math.max(process.stdout.columns - 1, 0)));
        console.log(`${chalk.red.bold("BUILD FAILED")} in ${this.timeDiffFromStartup()}`);
    }

    public static exit(code: number = 0): never {
        process.exit(code);
    }
}

export const println = IO.println.bind(IO);

export default IO;
