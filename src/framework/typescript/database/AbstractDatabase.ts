/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025, 2026 OSN Developers.
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

import type Application from "@framework/app/Application";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import QueryLogger from "./QueryLogger";

export type DatabaseOptions = {
    url: string;
};

abstract class AbstractDatabase<const T extends Record<string, unknown>> {
    protected readonly application: Application;
    protected readonly options: DatabaseOptions;
    public readonly pool: Pool;
    public readonly drizzle: ReturnType<typeof this.createDrizzle>["client"];

    public constructor(application: Application, options: DatabaseOptions) {
        this.application = application;
        this.options = options;

        const { pool, client } = this.createDrizzle();

        this.pool = pool;
        this.drizzle = client;
    }

    protected abstract createSchema(): T;

    protected createDrizzle() {
        const pool = new Pool({
            connectionString: this.options.url
        });

        const client = drizzle<T>(pool, {
            schema: this.createSchema(),
            logger: new QueryLogger()
        } as { logger: QueryLogger });

        return { pool, client };
    }

    public get query() {
        return this.drizzle.query;
    }
}

export default AbstractDatabase;
