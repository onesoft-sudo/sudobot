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
import { developmentMode } from "./utils";

export enum LogLevel {
    DEBUG,
    INFO,
    WARN,
    ERROR,
    CRITICAL
}

export function logWithLevel(level: LogLevel = LogLevel.DEBUG, ...message: any[]) {
    if (level !== LogLevel.CRITICAL && level !== LogLevel.ERROR && process.env.SUDO_ENV?.toLowerCase() === "testing") {
        return;
    }

    if (level === LogLevel.DEBUG) {
        if (!developmentMode()) return;

        console.debug(`${chalk.gray("[system:debug]")}`, ...message);
    } else if (level === LogLevel.INFO) console.info(`${chalk.cyan("[system:info]")}`, ...message);
    else if (level === LogLevel.WARN) console.warn(`${chalk.yellow("[system:warn]")}`, ...message);
    else if (level === LogLevel.ERROR) console.error(`${chalk.red("[system:error]")}`, ...message);
    else if (level === LogLevel.CRITICAL) {
        console.error(`${chalk.redBright("[system:critical]")}`, ...message);
        console.log("Critical error occurred. Exitting.");
        process.exit(-1);
    }
}

export function log(...message: any[]) {
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
