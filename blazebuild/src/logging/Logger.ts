import chalk from "chalk";
import BlazeBuild from "../core/BlazeBuild";
import IO from "../io/IO";

export const LogLevel = {
    Info: chalk.blue("[info]"),
    Warn: chalk.yellow("[warn]"),
    Error: chalk.red("[error]"),
    Debug: chalk.gray("[debug]"),
    Success: chalk.green("[success]")
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

class Logger {
    public constructor(protected readonly cli: BlazeBuild) {}

    private print(level: LogLevel, message: string | Error) {
        const methodName =
            level === LogLevel.Error
                ? "error"
                : level === LogLevel.Warn
                  ? "warn"
                  : level === LogLevel.Success
                    ? "log"
                    : level === LogLevel.Debug
                      ? "debug"
                      : "info";

        if (IO.getProgressBuffer()) {
            IO.println(`${level} ${message}`);
            return;
        } else {
            console[methodName].call(console, `${level}`, message);
        }
    }

    public info(message: string) {
        this.print(LogLevel.Info, message);
    }

    public warn(message: string) {
        this.print(LogLevel.Warn, message);
    }

    public error(message: string | Error) {
        this.print(LogLevel.Error, message);
    }

    public debug(message: string) {
        this.print(LogLevel.Debug, message);
    }

    public success(message: string) {
        this.print(LogLevel.Success, message);
    }

    public timeElapsed() {
        return ((Date.now() - BlazeBuild.startTime) / 1000).toFixed(2);
    }

    public showStats() {
        const actionableTasks = this.cli.taskManager.actionableTasks.size;
        const completedTasks = this.cli.taskManager.completedTasks.size;
        const upToDateTasks = Math.max(0, actionableTasks - completedTasks);

        console.info(
            `${actionableTasks} actionable task${
                actionableTasks === 1 ? "" : "s"
            }: ${completedTasks} executed` +
                (upToDateTasks > 0 ? `, ${upToDateTasks} up-to-date` : "")
        );
    }

    public buildSuccess() {
        console.info(`\n${chalk.greenBright("BUILD SUCCESSFUL")} in ${this.timeElapsed()}s`);
        this.showStats();
    }

    public buildFailed() {
        console.error(`\n${chalk.redBright("BUILD FAILED")} in ${this.timeElapsed()}s`);
        this.showStats();
    }
}

export default Logger;
