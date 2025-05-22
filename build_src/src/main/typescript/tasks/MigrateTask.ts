import { AbstractTask, Task, TaskAction } from "blazebuild";

@Task({
    description: "Runs the database migrations",
    group: "Database"
})
class MigrateTask extends AbstractTask {
    @TaskAction
    protected override async run(): Promise<void> {
        if (!process.env.DB_URL) {
            console.error("DB_URL environment variable is not set");
            process.exit(1);
        }

        const { drizzle } = await import(String("drizzle-orm/node-postgres"));
        const { migrate } = await import(
            String("drizzle-orm/node-postgres/migrator")
        );
        const { Pool } = await import(String("pg"));

        const pool = new Pool({
            connectionString: process.env.DB_URL
        });

        const db = drizzle(pool);
        await migrate(db, { migrationsFolder: "drizzle" });
        await pool.end();
    }
}

export default MigrateTask;
