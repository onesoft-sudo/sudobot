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
        this.log = this.log.bind(this);
        this.print = this.print.bind(this);
        this.colorize = this.colorize.bind(this);
        this.debug = this.debug.bind(this);
        this.perfStart = this.perfStart.bind(this);
        this.perfEnd = this.perfEnd.bind(this);
        this.perf = this.perf.bind(this);
        this.info = this.info.bind(this);
        this.warn = this.warn.bind(this);
        this.error = this.error.bind(this);
        this.fatal = this.fatal.bind(this);
        this.critical = this.critical.bind(this);
        this.success = this.success.bind(this);
        this.event = this.event.bind(this);
        this.bug = this.bug.bind(this);
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
            this.logTime ? `${chalk.gray(this.formatter.format(new Date()))} ` : ""
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

    public debug(...args: unknown[]) {
        if (!isDevelopmentMode()) {
            return;
        }

        this.log(LogLevel.Debug, ...args);
    }

    public bug(...args: unknown[]) {
        this.log(LogLevel.Bug, chalk.red("BUG:"), ...args);
    }

    public perfStart(id: string, ...args: unknown[]) {
        this.perf("time", id, ...args);
    }

    public perfEnd(id: string, ...args: unknown[]) {
        this.perf("timeEnd", id, ...args);
    }

    private perf(method: "time" | "timeEnd", id: string, ...args: unknown[]) {
        if (!isDevelopmentMode()) {
            return;
        }

        console[method](id);
        this.log(LogLevel.Performance, chalk.magenta(id), ...args);
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
