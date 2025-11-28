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
