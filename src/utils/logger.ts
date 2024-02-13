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
import { developmentMode } from "./utils";

export enum LogLevel {
    DEBUG,
    INFO,
    WARN,
    ERROR,
    CRITICAL,
    SUCCESS,
    EVENT
}

export function logWithLevel(level: LogLevel = LogLevel.DEBUG, ...message: any[]) {
    const logServerEnabled = Client.instance?.configManager?.systemConfig?.log_server?.enabled;

    if (level !== LogLevel.CRITICAL && level !== LogLevel.ERROR && process.env.SUDO_ENV?.toLowerCase() === "testing") {
        return;
    }

    if (level === LogLevel.DEBUG) {
        if (!developmentMode()) return;

        console.debug(`${chalk.gray("[system:debug]")}`, ...message);
    } else if (level === LogLevel.INFO) {
        console.info(`${chalk.cyan("[system:info]")}`, ...message);
    } else if (level === LogLevel.WARN) {
        console.warn(`${chalk.yellow("[system:warn]")}`, ...message);
    } else if (level === LogLevel.ERROR) {
        console.error(`${chalk.red("[system:error]")}`, ...message);
    } else if (level === LogLevel.SUCCESS) {
        console.error(`${chalk.green("[system:success]")}`, ...message);
    } else if (level === LogLevel.EVENT) {
        console.error(`${chalk.green("[system:event]")}`, ...message);
    } else if (level === LogLevel.CRITICAL) {
        console.error(`${chalk.redBright("[system:critical]")}`, ...message);

        if (logServerEnabled) {
            Client.instance?.logServer?.send(`[system:critical] ${message.join(" ")}`);
        }

        console.log("Critical error occurred. Exiting.");
        process.exit(-1);
    }

    if (logServerEnabled) {
        // `[system:${LogLevel[level].toLowerCase()}] ${message.join(" ")}`
        Client.instance?.logServer?.log?.(level, message.join(" "));
    }
}

export function logStringWithLevel(level: LogLevel = LogLevel.DEBUG, ...message: any[]) {
    if (level !== LogLevel.CRITICAL && level !== LogLevel.ERROR && process.env.SUDO_ENV?.toLowerCase() === "testing") {
        return;
    }

    if (level === LogLevel.DEBUG) {
        if (!developmentMode()) return;

        return `${chalk.gray("[system:debug]")} ` + message.join(" ");
    } else if (level === LogLevel.INFO) {
        return `${chalk.cyan("[system:info]")} ` + message.join(" ");
    } else if (level === LogLevel.WARN) {
        return `${chalk.yellow("[system:warn]")} ` + message.join(" ");
    } else if (level === LogLevel.ERROR) {
        return `${chalk.red("[system:error]")} ` + message.join(" ");
    } else if (level === LogLevel.SUCCESS) {
        return `${chalk.green("[system:success]")} ` + message.join(" ");
    } else if (level === LogLevel.EVENT) {
        return `${chalk.green("[system:event]")} ` + message.join(" ");
    } else if (level === LogLevel.CRITICAL) {
        return `${chalk.redBright("[system:critical]")} ` + message.join(" ");
    }
}

/**
 * Logs a message to the console, with debug mode.
 *
 * @deprecated Use logDebug instead
 * @param message The message to log
 */
export function log(...message: any[]) {
    return logWithLevel(LogLevel.DEBUG, ...message);
}

/**
 * Logs a message to the console, with debug mode.
 *
 * @param message The message to log
 */
export function logDebug(...message: any[]) {
    return logWithLevel(LogLevel.DEBUG, ...message);
}

export function logError(...message: any[]) {
    return logWithLevel(LogLevel.ERROR, ...message);
}

export function logInfo(...message: any[]) {
    return logWithLevel(LogLevel.INFO, ...message);
}

export function logWarn(...message: any[]) {
    return logWithLevel(LogLevel.WARN, ...message);
}

export function logSuccess(...message: any[]) {
    return logWithLevel(LogLevel.SUCCESS, ...message);
}
