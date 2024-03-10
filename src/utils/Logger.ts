/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
 *
 * SudoBot is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SudoBot is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
 */
import chalk from "chalk";
import Client from "../core/Client";
import { AnyFunction } from "../types/Utils";
import { developmentMode } from "./utils";

export enum LogLevel {
    Debug,
    Info,
    Warn,
    Error,
    Fatal,
    Critical,
    Success,
    Event
}

export class Logger {
    private readonly formatter = Intl.DateTimeFormat("en-US", {
        dateStyle: "long",
        timeStyle: "long"
    });

    public constructor(private readonly name: string, private readonly logTime: boolean = false) {
        for (const key in this) {
            if (typeof this[key] === "function") {
                (this[key] as AnyFunction) = (this[key] as AnyFunction).bind(this);
            }
        }
    }

    public log(level: LogLevel, ...args: unknown[]) {
        const levelName = LogLevel[level].toLowerCase();
        const methodName =
            level === LogLevel.Info || level === LogLevel.Success || level === LogLevel.Event
                ? "info"
                : level === LogLevel.Debug
                ? "debug"
                : level === LogLevel.Warn
                ? "warn"
                : "error";
        const beginning = `${
            this.logTime ? `${chalk.gray(this.formatter.format(new Date()))} ` : ""
        }${this.colorize(`${this.name}:${levelName}`, level)}`;
        this.print(methodName, beginning, ...args);

        if (level === LogLevel.Fatal) {
            console.log("Critical error occurred. Exiting.");
            process.exit(-1);
        }
    }

    public print(methodName: "log" | "info" | "warn" | "error" | "debug", ...args: unknown[]) {
        const logServerEnabled = Client.instance?.configManager?.systemConfig?.log_server?.enabled;

        if (process.env.SUPRESS_LOGS) {
            return;
        }

        console[methodName].call(console, ...args);
        const message = args
            .map(arg => (typeof arg === "string" ? arg : JSON.stringify(arg, null, 2)))
            .join(" ");

        if (logServerEnabled) {
            Client.instance.logServer?.log(message);
        }
    }

    private colorize(text: string, level: LogLevel) {
        switch (level) {
            case LogLevel.Debug:
                return chalk.gray.dim(text);

            case LogLevel.Critical:
            case LogLevel.Fatal:
                return chalk.redBright(text);

            case LogLevel.Error:
                return chalk.red(text);

            case LogLevel.Warn:
                return chalk.yellowBright(text);

            case LogLevel.Info:
                return chalk.blueBright(text);

            case LogLevel.Success:
            case LogLevel.Event:
                return chalk.greenBright(text);
        }
    }

    public debug(...args: unknown[]) {
        if (!developmentMode()) {
            return;
        }

        this.log(LogLevel.Debug, ...args);
    }

    public info(...args: unknown[]) {
        this.log(LogLevel.Info, ...args);
    }

    public warn(...args: unknown[]) {
        this.log(LogLevel.Warn, ...args);
    }

    public error(...args: unknown[]) {
        this.log(LogLevel.Error, ...args);
    }

    public fatal(...args: unknown[]) {
        this.log(LogLevel.Fatal, ...args);
    }

    public critical(...args: unknown[]) {
        this.log(LogLevel.Critical, ...args);
    }

    public success(...args: unknown[]) {
        this.log(LogLevel.Success, ...args);
    }

    public event(...args: unknown[]) {
        this.log(LogLevel.Event, ...args);
    }
}

/**
 * Logs a debug message to the console.
 *
 * @deprecated Use the logger instance instead.
 */
export const logDebug = (...args: unknown[]) => Client.getLogger().debug(...args);

/**
 * Alias of logDebug.
 *
 * @deprecated Use the logger instance instead.
 */
export const log = logDebug;

/**
 * Logs an info message to the console.
 *
 * @deprecated Use the logger instance instead.
 */
export const logInfo = (...args: unknown[]) => Client.getLogger().info(...args);

/**
 * Logs a warning to the console.
 *
 * @deprecated Use the logger instance instead.
 */
export const logWarn = (...args: unknown[]) => Client.getLogger().warn(...args);

/**
 * Logs an error to the console.
 *
 * @deprecated Use the logger instance instead.
 */

export const logError = (...args: unknown[]) => Client.getLogger().error(...args);

/**
 * Logs a fatal error to the console and exits the process.
 *
 * @deprecated Use the logger instance instead.
 */

export const logFatal = (...args: unknown[]) => Client.getLogger().fatal(...args);

/**
 * Logs a critical error to the console.
 *
 * @deprecated Use the logger instance instead.
 */

export const logCritical = (...args: unknown[]) => Client.getLogger().critical(...args);

/**
 * Logs a success message to the console.
 *
 * @deprecated Use the logger instance instead.
 */

export const logSuccess = (...args: unknown[]) => Client.getLogger().success(...args);

/**
 * Logs an event message to the console.
 *
 * @deprecated Use the logger instance instead.
 */

export const logEvent = (...args: unknown[]) => Client.getLogger().event(...args);

/**
 * Logs a message to the console with a specified log level.
 *
 * @deprecated Use the logger instance instead.
 */

export const logWithLevel = (level: LogLevel, ...args: unknown[]) =>
    Client.getLogger().log(level, ...args);
