/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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

import { isDevelopmentMode } from "@framework/utils/utils";
import chalk from "chalk";
import { EventEmitter } from "events";

export enum LogLevel {
    Debug,
    Info,
    Warn,
    Error,
    Fatal,
    Critical,
    Success,
    Event,
    Performance,
    Bug
}

export class Logger {
    private readonly formatter = Intl.DateTimeFormat("en-US", {
        dateStyle: "long",
        timeStyle: "long"
    });
    private readonly eventEmitter = new EventEmitter();

    public constructor(
        private readonly name: string,
        private readonly logTime: boolean = false
    ) {
        (this as unknown as Logger).log = (this as unknown as Logger).log.bind(this);
        this.print = this.print.bind(this);
        this.colorize = this.colorize.bind(this);
        this.debug = this.debug.bind(this as unknown as void);
        this.perfStart = this.perfStart.bind(this);
        this.perfEnd = this.perfEnd.bind(this);
        this.perf = this.perf.bind(this as unknown as void);
        this.info = this.info.bind(this as unknown as void);
        this.warn = this.warn.bind(this as unknown as void);
        this.error = this.error.bind(this as unknown as void);
        this.fatal = this.fatal.bind(this as unknown as void);
        this.critical = this.critical.bind(this as unknown as void);
        this.success = this.success.bind(this as unknown as void);
        this.event = this.event.bind(this as unknown as void);
        this.bug = this.bug.bind(this as unknown as void);
    }

    public on(event: "log", listener: (message: string) => void) {
        this.eventEmitter.on(event, listener);
    }

    public log(level: LogLevel, ...args: unknown[]) {
        const levelName = LogLevel[level].toLowerCase();
        const methodName =
            level === LogLevel.Info || level === LogLevel.Success || level === LogLevel.Event
                ? "info"
                : level === LogLevel.Debug || level === LogLevel.Performance
                  ? "debug"
                  : level === LogLevel.Warn
                    ? "warn"
                    : "error";
        const beginning = `${
            (this as unknown as Logger).logTime
                ? `${chalk.gray(this.formatter.format(new Date()))} `
                : ""
        }${this.colorize(`[${this.name}:${levelName}]`, level)}`;
        this.print(methodName, beginning, ...args);

        if (level === LogLevel.Fatal) {
            console.error("Critical error occurred. Exiting.");
            process.exit(-1);
        }
    }

    public print(
        methodName: "log" | "info" | "warn" | "error" | "debug" | "trace",
        ...args: unknown[]
    ) {
        if (process.env.SUPPRESS_LOGS) {
            return;
        }

        if (args.length === 1 && args[0] instanceof Error) {
            console[methodName].call(console, "\n");
            console[methodName].call(console, args[0]);
            const message = args[0].message + "\n" + (args[0].stack ?? "");
            this.eventEmitter.emit("log", message);
            return;
        }

        console[methodName].call(console, ...args);
        const message = args
            .map(arg => (typeof arg === "string" ? arg : JSON.stringify(arg, null, 2)))
            .join(" ");

        this.eventEmitter.emit("log", message);
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

            case LogLevel.Performance:
                return chalk.magenta(text);

            case LogLevel.Bug:
                return chalk.red(text);
        }
    }

    public debug(this: void, ...args: unknown[]) {
        if (!isDevelopmentMode()) {
            return;
        }

        (this as unknown as Logger).log(LogLevel.Debug, ...args);
    }

    public bug(this: void, ...args: unknown[]) {
        (this as unknown as Logger).log(LogLevel.Bug, chalk.red("BUG:"), ...args);
    }

    public perfStart(id: string, ...args: unknown[]) {
        this.perf("time", id, ...args);
    }

    public perfEnd(id: string, ...args: unknown[]) {
        this.perf("timeEnd", id, ...args);
    }

    private perf(this: void, method: "time" | "timeEnd", id: string, ...args: unknown[]) {
        if (!isDevelopmentMode()) {
            return;
        }

        console[method](id);
        (this as unknown as Logger).log(LogLevel.Performance, chalk.magenta(id), ...args);
    }

    public info(this: void, ...args: unknown[]) {
        (this as unknown as Logger).log(LogLevel.Info, ...args);
    }

    public warn(this: void, ...args: unknown[]) {
        (this as unknown as Logger).log(LogLevel.Warn, ...args);
    }

    public error(this: void, ...args: unknown[]) {
        (this as unknown as Logger).log(LogLevel.Error, ...args);
    }

    public fatal(this: void, ...args: unknown[]) {
        (this as unknown as Logger).log(LogLevel.Fatal, ...args);
    }

    public critical(this: void, ...args: unknown[]) {
        (this as unknown as Logger).log(LogLevel.Critical, ...args);
    }

    public success(this: void, ...args: unknown[]) {
        (this as unknown as Logger).log(LogLevel.Success, ...args);
    }

    public event(this: void, ...args: unknown[]) {
        (this as unknown as Logger).log(LogLevel.Event, ...args);
    }
}
