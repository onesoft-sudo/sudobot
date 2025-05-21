import chalk from "chalk";
import { LogLevel } from "./LogLevel";

export class Logger {
    public constructor() {
        this.debug = this.debug.bind(this);
        this.info = this.info.bind(this);
        this.warning = this.warning.bind(this);
        this.error = this.error.bind(this);
        this.fatal = this.fatal.bind(this);
        this.log = this.log.bind(this);
    }

    public log(level: LogLevel, message: string): void {
        const levelName = LogLevel[level];
        const consoleMethod =
            level === LogLevel.Error || level === LogLevel.Fatal || level === LogLevel.Warning
                ? "error"
                : level === LogLevel.Info
                  ? "info"
                  : "log";
        console[consoleMethod].call(console, `${this.colorize(level, `${levelName}:`)} ${message}`);
    }

    private colorize(level: LogLevel, message: string): string {
        switch (level) {
            case LogLevel.Debug:
                return chalk.white.dim(`${message}`);
            case LogLevel.Info:
                return chalk.blue(`${message}`);
            case LogLevel.Warning:
                return chalk.yellow(`${message}`);
            case LogLevel.Error:
                return chalk.red(`${message}`);
            case LogLevel.Fatal:
                return chalk.redBright(`${message}`);
            default:
                return message;
        }
    }

    public debug(message: string): void {
        if (process.env.DEBUG != "1") {
            return;
        }

        this.log(LogLevel.Debug, message);
    }

    public info(message: string): void {
        this.log(LogLevel.Info, message);
    }

    public warning(message: string): void {
        this.log(LogLevel.Warning, message);
    }

    public error(message: string): void {
        this.log(LogLevel.Error, message);
    }

    public fatal(message: string): void {
        this.log(LogLevel.Fatal, message);
    }
}

export default Logger;
