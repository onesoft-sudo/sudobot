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

import { Logger } from "@framework/log/Logger";
import chalk from "chalk";
import type { Logger as DrizzleLogger } from "drizzle-orm";

class QueryLogger implements DrizzleLogger {
    private readonly logger = new Logger("drizzle", true);

    public logQuery(query: string, params: unknown[]): void {
        this.logger.info(
            `${chalk.green("Query")}: ${query} | ${chalk.white.bold("Params")}: ${JSON.stringify(params)}`
        );
    }
}

export default QueryLogger;
