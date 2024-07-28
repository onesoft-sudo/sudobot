import { AbstractTask, IO, Task, TaskAction } from "blazebuild";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

@Task({
    description: "Runs the database migrations",
    group: "Database"
})
class MigrateTask extends AbstractTask {
    @TaskAction
    protected override async run(): Promise<void> {
        IO.newline();

        if (!process.env.DB_URL) {
            IO.fatal("DB_URL environment variable is not set");
        }

        const pool = new Pool({
            connectionString: process.env.DB_URL
        });

        const db = drizzle(pool);
        await migrate(db, { migrationsFolder: "drizzle" });
        await pool.end();
    }
}

export default MigrateTask;
